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
  // Optional legacy/extended fields (may not exist in all deployments)
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data as Profile | null);
  };

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const r = (data ?? []).map((d: any) => d.role as AppRole);
    setRoles(r);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session: Session | null) => {
      if (session?.user) {
        setUser(session.user);
        // Use setTimeout to avoid Supabase auth deadlock
        setTimeout(() => {
          fetchProfile(session.user.id);
          fetchRoles(session.user.id);
          setIsLoading(false);
        }, 0);
      } else {
        setUser(null);
        setProfile(null);
        setRoles([]);
        setIsLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Subscribe to real-time changes on the user's profile
  useEffect(() => {
    if (!user?.id) return;
    const profileSubscription = supabase
      .channel('profiles')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          // Update profile when approval status changes
          const updatedProfile = payload.new as Profile;
          setProfile(updatedProfile);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(profileSubscription);
    };
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Primary role: admin > dono > funcionario > cliente — falls back to profile.role if user_roles is empty
  const role: AppRole = roles.includes("admin") ? "admin" : roles.includes("dono") ? "dono" : roles.includes("funcionario") ? "funcionario" : roles.includes("cliente") ? "cliente" : profile?.role ?? "cliente";

  const isApproved = profile?.status === "approved" || !!profile?.approved_at;

  return (
    <AuthContext.Provider
      value={{ user, profile, role, roles, isAuthenticated: !!user, isApproved, isLoading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};