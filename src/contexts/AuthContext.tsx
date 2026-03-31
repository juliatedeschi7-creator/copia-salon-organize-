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
  profileError: boolean;
  profileDiagnostic: string | null;
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
  profileDiagnostic: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });

const nowHMS = () => new Date().toTimeString().slice(0, 8);

const diagErrorStr = (operation: string, error: unknown): string => {
  const e = error as Error | null | undefined;
  const isTimeout = e?.message?.includes("Timeout");
  if (isTimeout) return `${operation}:timeout-8s`;
  return `${operation}:${String(e?.message || error).slice(0, 80)}`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [profileDiagnostic, setProfileDiagnostic] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const prevUserIdRef = useRef<string | null>(null);
  const retryDoneRef = useRef(false);
  const loadingCompleteRef = useRef(false);

  const hardResetToLogin = () => {
    if (typeof window === "undefined") return;

    try {
      [localStorage, sessionStorage].forEach((store) => {
        Object.keys(store)
          .filter((k) => k.startsWith("sb-"))
          .forEach((k) => store.removeItem(k));
      });
    } catch {
      // ignore
    }

    window.location.assign("/");
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // ignore
    }

    setUser(null);
    setProfile(null);
    setRoles([]);
    setProfileLoaded(false);
    setProfileError(false);
    setProfileDiagnostic(null);
    prevUserIdRef.current = null;
    retryDoneRef.current = false;

    hardResetToLogin();
  };

  const fetchProfile = async (userId: string, diag?: string[]): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, role, status, approved_at, is_approved, user_id, phone, deleted_at, access_state, access_message, notice_until"
      )
      .eq("id", userId)
      .single();

    if (error) {
      if (diag) {
        const parts: string[] = ["fetchProfile"];
        if (error.message) parts.push(error.message.slice(0, 100));
        if ((error as any).code) parts.push(`code:${(error as any).code}`);
        const status = (error as unknown as Record<string, unknown>).status;
        if (status) parts.push(`HTTP${status}`);
        diag.push(parts.join(" "));
      }
      return null;
    }

    return data as Profile;
  };

  const fetchRoles = async (userId: string, diag?: string[]): Promise<AppRole[]> => {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);

    if (error) {
      if (diag) {
        const parts: string[] = ["fetchRoles"];
        if (error.message) parts.push(error.message.slice(0, 100));
        if ((error as any).code) parts.push(`code:${(error as any).code}`);
        const status = (error as unknown as Record<string, unknown>).status;
        if (status) parts.push(`HTTP${status}`);
        diag.push(parts.join(" "));
      }
      return [];
    }

    return ((data?.map((r) => r.role) as AppRole[]) || []) as AppRole[];
  };

  useEffect(() => {
    console.log("🚀 AuthProvider mounting...");
    mountedRef.current = true;
    loadingCompleteRef.current = false;

    // AGGRESSIVE SAFETY TIMER: 5 seconds instead of 10
    const safetyTimer = setTimeout(async () => {
      if (!mountedRef.current || loadingCompleteRef.current) return;

      console.warn("⚠️ Auth safety timeout (5s): forcing UI unblock");

      let hasSession = false;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        hasSession = !!session;

        if (session) {
          console.log("🔄 Session found, attempting refresh");
          await supabase.auth.refreshSession();
        }
      } catch (e) {
        console.warn("⚠️ Last-chance recovery failed:", e);
      }

      if (!mountedRef.current || loadingCompleteRef.current) return;

      loadingCompleteRef.current = true;
      setIsLoading(false);
      setProfileLoaded(true);
      setProfileError(!hasSession);
      setProfileDiagnostic(`safety-timeout:5s ts:${nowHMS()}`);

      if (hasSession) {
        await signOut();
      }
    }, 5_000); // ← CHANGED FROM 10_000 TO 5_000

    // TRY INITIAL SESSION WITH SHORT TIMEOUT
    const initialSessionPromise = withTimeout(supabase.auth.getSession(), 3_000) // ← SHORT TIMEOUT
      .then(({ data: { session } }) => {
        if (!mountedRef.current || loadingCompleteRef.current) return;
        
        console.log("✅ Initial session check completed");
        
        if (!session) {
          console.log("❌ No session found, user is logged out");
          loadingCompleteRef.current = true;
          setIsLoading(false);
          setProfileLoaded(true);
        }
      })
      .catch((error) => {
        if (!mountedRef.current || loadingCompleteRef.current) return;
        console.warn("⚠️ Initial session check failed or timed out:", error);
        loadingCompleteRef.current = true;
        setIsLoading(false);
        setProfileLoaded(true);
      });

    // STORAGE SYNC: Listen for changes across browser tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      console.log("📡 Storage changed in another tab, syncing auth state");

      if (e.key?.startsWith("sb-") && e.key?.endsWith("-auth-token")) {
        if (!e.newValue) {
          console.warn("🔄 Auth token removed, signing out locally");
          setUser(null);
          setProfile(null);
          setRoles([]);
        } else {
          console.log("🔄 Auth token updated, refreshing session");
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user && mountedRef.current) {
              console.log("🔄 Session recovered from another tab");
              setUser(session.user);
            }
          });
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // MAIN AUTH STATE LISTENER
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mountedRef.current) return;

      console.log("🔐 Auth state changed:", _event, !!session?.user);

      if (session?.user) {
        const userId = session.user.id;
        const isNewUser = userId !== prevUserIdRef.current;

        setUser(session.user);

        if (isNewUser) {
          console.log("👤 New user detected:", userId);
          prevUserIdRef.current = userId;
          loadingCompleteRef.current = false;
          setProfileLoaded(false);
          setProfileError(false);
          setProfileDiagnostic(null);
          retryDoneRef.current = false;
        }

        const diagParts: string[] = [`ts:${nowHMS()}`];

        const [prof, userRoles] = await Promise.all([
          withTimeout(fetchProfile(userId, diagParts), 8_000).catch((e) => {
            diagParts.push(diagErrorStr("fetchProfile", e));
            return null;
          }),
          withTimeout(fetchRoles(userId, diagParts), 8_000).catch((e) => {
            diagParts.push(diagErrorStr("fetchRoles", e));
            return [] as AppRole[];
          }),
        ]);

        if (!mountedRef.current) return;

        if (prof === null && !retryDoneRef.current) {
          console.warn("⚠️ Profile fetch failed, attempting refresh");
          retryDoneRef.current = true;

          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (!mountedRef.current) return;

          if (refreshError) {
            diagParts.push(`refreshSession:${refreshError.message?.slice(0, 80) || "error"}`);
          }

          if (!refreshError && refreshData.session?.user) {
            const [prof2, userRoles2] = await Promise.all([
              withTimeout(fetchProfile(refreshData.session.user.id, diagParts), 8_000).catch((e) => {
                diagParts.push(diagErrorStr("fetchProfile-retry", e));
                return null;
              }),
              withTimeout(fetchRoles(refreshData.session.user.id, diagParts), 8_000).catch((e) => {
                diagParts.push(diagErrorStr("fetchRoles-retry", e));
                return [] as AppRole[];
              }),
            ]);

            if (!mountedRef.current) return;

            if (prof2 !== null) {
              console.log("✅ Profile recovered after refresh");
              loadingCompleteRef.current = true;
              setProfile(prof2);
              setRoles(userRoles2);
              setProfileError(false);
              setProfileLoaded(true);
              setIsLoading(false);
              return;
            }
          }

          console.error("❌ Profile fetch failed permanently");
          loadingCompleteRef.current = true;
          setProfile(null);
          setRoles([]);
          setProfileError(true);
          setProfileDiagnostic(diagParts.join(" | "));
          setProfileLoaded(true);
          setIsLoading(false);

          await signOut();
          return;
        }

        console.log("✅ Profile and roles loaded successfully");
        loadingCompleteRef.current = true;
        setProfile(prof);
        setRoles(userRoles);
        setProfileError(false);
        setProfileLoaded(true);
        setIsLoading(false);
      } else {
        console.log("🚪 User logged out");
        loadingCompleteRef.current = true;
        setUser(null);
        setProfile(null);
        setRoles([]);
        setProfileLoaded(false);
        setProfileError(false);
        setProfileDiagnostic(null);
        prevUserIdRef.current = null;
        retryDoneRef.current = false;
        setIsLoading(false);
      }
    });

    return () => {
      console.log("🛑 AuthProvider cleanup");
      mountedRef.current = false;
      clearTimeout(safetyTimer);
      subscription?.unsubscribe();
      window.removeEventListener("storage", handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isApproved = profile?.status === "approved" || !!profile?.approved_at || profile?.is_approved === true;

  const role: AppRole = roles.includes("admin")
    ? "admin"
    : roles.includes("dono")
    ? "dono"
    : roles.includes("funcionario")
    ? "funcionario"
    : roles.includes("cliente")
    ? "cliente"
    : profile?.role ?? "cliente";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        roles,
        isAuthenticated: !!user,
        isApproved,
        isLoading,
        profileLoaded,
        profileError,
        profileDiagnostic,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};