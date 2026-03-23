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
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const mountedRef = useRef(true);
  const prevUserIdRef = useRef<string | null>(null);

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

    // onAuthStateChange fires INITIAL_SESSION synchronously on mount,
    // covering the "check current session" case and eliminating the race
    // condition that existed when using getSession() in parallel.
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
          setProfileLoaded(false);
        }

        const [prof, userRoles] = await Promise.all([
          fetchProfile(session.user.id),
          fetchRoles(session.user.id),
        ]);

        if (!mountedRef.current) return;

        setProfile(prof);
        setRoles(userRoles);
        setProfileLoaded(true);
      } else {
        console.log("🔴 User logged out");
        setUser(null);
        setProfile(null);
        setRoles([]);
        setProfileLoaded(false);
        prevUserIdRef.current = null;
      }

      // Mark initial auth check as complete after first event is handled
      setIsLoading(false);
    });

    return () => {
      mountedRef.current = false;
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
      value={{ user, profile, role, roles, isAuthenticated: !!user, isApproved, isLoading, profileLoaded, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};
