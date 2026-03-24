import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/types";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole | null;
  status: "pending" | "approved" | null;
  approved_at: string | null;
  is_approved?: boolean;
  phone?: string | null;
  user_id?: string | null;
  deleted_at?: string | null;
  access_state?: string | null;
  access_message?: string | null;
  notice_until?: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: AppRole;
  roles: AppRole[];
  isAuthenticated: boolean;
  isApproved: boolean;
  isLoading: boolean;
  profileLoaded: boolean;
  /** true when profile could not be loaded due to a session/network error (not a "not approved" situation) */
  profileError: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: "cliente",
  roles: [],
  isAuthenticated: false,
  isApproved: false,
  isLoading: true,
  profileLoaded: false,
  profileError: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

/** Wraps a promise with a hard deadline; rejects after `ms` ms if not settled. */
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(id); resolve(v); },
      (e) => { clearTimeout(id); reject(e); }
    );
  });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const mountedRef = useRef(true);
  const prevUserIdRef = useRef<string | null>(null);
  // Limit session-refresh retries to 1 per authenticated user to avoid loops
  const retryDoneRef = useRef(false);
  // Track whether the loading cycle completed to allow the safety-timer to
  // detect a stuck state and prevent double-processing with getSession().
  const loadingCompleteRef = useRef(false);

  // Fetch user profile from public.profiles
  const fetchProfile = async (userId: string) => {
    console.log("🔵 Fetching profile for userId:", userId);
    
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, status, approved_at, is_approved, user_id, phone, deleted_at, access_state, access_message, notice_until")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("❌ Error fetching profile:", error);
      return null;
    }

    console.log("✅ Profile fetched:", {
      id: data?.id,
      email: data?.email,
      status: data?.status,
      approved_at: data?.approved_at,
      is_approved: data?.is_approved,
    });

    return data as Profile;
  };

  // Fetch user roles from public.user_roles
  const fetchRoles = async (userId: string) => {
    console.log("🔵 Fetching roles for userId:", userId);
    
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      console.error("❌ Error fetching roles:", error);
      return [];
    }

    const rolesArray = (data?.map((r) => r.role) as AppRole[]) || [];
    console.log("✅ Roles fetched:", rolesArray);
    
    return rolesArray;
  };

  // Set up auth state listener — single source of truth via onAuthStateChange
  useEffect(() => {
    mountedRef.current = true;
    loadingCompleteRef.current = false;

    // Safety timer: if the normal auth flow does not complete within 10 s
    // (e.g. fetchProfile/fetchRoles hang), force-unblock the UI so the user
    // is never stuck on an infinite spinner.
    const safetyTimer = setTimeout(() => {
      if (!mountedRef.current || loadingCompleteRef.current) return;
      console.warn("⚠️ Auth safety timeout: forcing state to unblock UI");
      loadingCompleteRef.current = true;
      setIsLoading(false);
      setProfileLoaded(true);
      setProfileError(true);
    }, 10_000);

    // Fallback: call getSession() on mount so that if INITIAL_SESSION does not
    // fire (edge case in some browsers/environments) and there is no active
    // session, loading is unblocked immediately instead of waiting for the timer.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mountedRef.current || loadingCompleteRef.current) return;
      if (!session) {
        loadingCompleteRef.current = true;
        setIsLoading(false);
        setProfileLoaded(true);
      }
    }).catch(() => {
      if (mountedRef.current && !loadingCompleteRef.current) {
        loadingCompleteRef.current = true;
        setIsLoading(false);
        setProfileLoaded(true);
      }
    });

    // onAuthStateChange is the primary source of truth for auth state.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state changed:", event);

      if (!mountedRef.current) return;

      if (session?.user) {
        const userId = session.user.id;
        const isNewUser = userId !== prevUserIdRef.current;

        console.log("🔐 User authenticated:", session.user.email);
        setUser(session.user);

        // Only reset profileLoaded (show spinner) when a different user signs in.
        // For token refreshes / updates of the same session, keep the existing
        // profile visible and silently refresh it in the background.
        if (isNewUser) {
          prevUserIdRef.current = userId;
          loadingCompleteRef.current = false;
          setProfileLoaded(false);
          setProfileError(false);
          retryDoneRef.current = false;
        }

        const [prof, userRoles] = await Promise.all([
          withTimeout(fetchProfile(session.user.id), 8_000).catch((e) => {
            console.error("⏱️ fetchProfile timed out or failed:", e);
            return null;
          }),
          withTimeout(fetchRoles(session.user.id), 8_000).catch((e) => {
            console.error("⏱️ fetchRoles timed out or failed:", e);
            return [] as AppRole[];
          }),
        ]);

        if (!mountedRef.current) return;

        // If profile fetch failed and we haven't retried yet, attempt a session
        // refresh (fixes Safari / ITP where the stored token is stale) and retry.
        if (prof === null && !retryDoneRef.current) {
          retryDoneRef.current = true;
          console.warn("⚠️ Profile fetch returned null — attempting session refresh and retry...");

          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (!mountedRef.current) return;

          if (!refreshError && refreshData.session?.user) {
            const [prof2, userRoles2] = await Promise.all([
              withTimeout(fetchProfile(refreshData.session.user.id), 8_000).catch(() => null),
              withTimeout(fetchRoles(refreshData.session.user.id), 8_000).catch(() => [] as AppRole[]),
            ]);

            if (!mountedRef.current) return;

            if (prof2 !== null) {
              // Retry succeeded
              loadingCompleteRef.current = true;
              setProfile(prof2);
              setRoles(userRoles2);
              setProfileError(false);
              setProfileLoaded(true);
              setIsLoading(false);
              return;
            }
          }

          // Both attempts failed — mark as session error so the UI can show an
          // appropriate message instead of the "Aguardando aprovação" screen.
          console.error("❌ Profile could not be loaded after session refresh — marking profileError.");
          loadingCompleteRef.current = true;
          setProfile(null);
          setRoles([]);
          setProfileError(true);
          setProfileLoaded(true);
        } else {
          loadingCompleteRef.current = true;
          setProfile(prof);
          setRoles(userRoles);
          setProfileError(false);
          setProfileLoaded(true);
        }
      } else {
        console.log("🔴 User logged out");
        loadingCompleteRef.current = true;
        setUser(null);
        setProfile(null);
        setRoles([]);
        setProfileLoaded(false);
        setProfileError(false);
        prevUserIdRef.current = null;
        retryDoneRef.current = false;
      }

      // Mark initial auth check as complete after first event is handled
      setIsLoading(false);
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimer);
      subscription?.unsubscribe();
    };
  }, []);

  // Compute approval status - ✅ Check all possible approval fields
  const isApproved = 
    profile?.status === "approved" || 
    !!profile?.approved_at || 
    profile?.is_approved === true;

  console.log("🟡 Approval status:", { isApproved, status: profile?.status, approved_at: profile?.approved_at, is_approved: profile?.is_approved });

  // Primary role: admin > dono > funcionario > cliente
  const role: AppRole = 
    roles.includes("admin") 
      ? "admin" 
      : roles.includes("dono") 
      ? "dono" 
      : roles.includes("funcionario") 
      ? "funcionario" 
      : roles.includes("cliente") 
      ? "cliente" 
      : profile?.role ?? "cliente";

  console.log("🟠 Current role:", role, "roles array:", roles);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRoles([]);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, role, roles, isAuthenticated: !!user, isApproved, isLoading, profileLoaded, profileError, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};
