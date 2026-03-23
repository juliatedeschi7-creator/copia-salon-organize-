import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/types";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole | null;
  status: "pending" | "approved" | null;
  approved_at: string | null;
  is_approved?: boolean;
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
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from public.profiles
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, status, approved_at, is_approved, deleted_at")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    return data as Profile;
  };

  // Fetch user roles from public.user_roles
  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching roles:", error);
      return [];
    }

    return (data?.map((r) => r.role) as AppRole[]) || [];
  };

  // Set up auth state listener
  useEffect(() => {
    const setupAuth = async () => {
      // Check current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        const prof = await fetchProfile(session.user.id);
        setProfile(prof);
        const userRoles = await fetchRoles(session.user.id);
        setRoles(userRoles);
      }

      setIsLoading(false);
    };

    setupAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const prof = await fetchProfile(session.user.id);
        setProfile(prof);
        const userRoles = await fetchRoles(session.user.id);
        setRoles(userRoles);
      } else {
        setUser(null);
        setProfile(null);
        setRoles([]);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Compute approval status - ✅ Check all possible approval fields
  const isApproved = 
    profile?.status === "approved" || 
    !!profile?.approved_at || 
    profile?.is_approved === true;

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

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRoles([]);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, role, roles, isAuthenticated: !!user, isApproved, isLoading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};
