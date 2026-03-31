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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [profileDiagnostic, setProfileDiagnostic] = useState<string | null>(null);

  const mountedRef = useRef(true);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}

    setUser(null);
    setProfile(null);
    setRoles([]);
    setProfileLoaded(false);
    setProfileError(false);
    setProfileDiagnostic(null);

    window.location.assign("/");
  };

  // 🔥 CORRIGIDO AQUI
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId) // ✅ CORREÇÃO PRINCIPAL
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar profile:", error);
      return null;
    }

    return data;
  };

  const fetchRoles = async (userId: string): Promise<AppRole[]> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      console.error("Erro ao buscar roles:", error);
      return [];
    }

    return (data?.map((r) => r.role) as AppRole[]) || [];
  };

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mountedRef.current) return;

        if (!session?.user) {
          setIsLoading(false);
          setProfileLoaded(true);
          return;
        }

        const userId = session.user.id;
        setUser(session.user);

        const [prof, roles] = await Promise.all([
          fetchProfile(userId),
          fetchRoles(userId),
        ]);

        if (!mountedRef.current) return;

        setProfile(prof);
        setRoles(roles);
        setProfileLoaded(true);
        setProfileError(!prof); // se não achou profile
      } catch (error) {
        console.error("Erro na inicialização:", error);
        setProfileError(true);
      } finally {
        setIsLoading(false); // ✅ nunca trava
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mountedRef.current) return;

        if (session?.user) {
          const userId = session.user.id;
          setUser(session.user);

          const [prof, roles] = await Promise.all([
            fetchProfile(userId),
            fetchRoles(userId),
          ]);

          setProfile(prof);
          setRoles(roles);
          setProfileLoaded(true);
          setProfileError(!prof);
        } else {
          setUser(null);
          setProfile(null);
          setRoles([]);
          setProfileLoaded(false);
        }

        setIsLoading(false); // ✅ garante fim do loading
      }
    );

    return () => {
      mountedRef.current = false;
      subscription?.unsubscribe();
    };
  }, []);

  const isApproved =
    profile?.status === "approved" ||
    !!profile?.approved_at ||
    profile?.is_approved === true;

  const role: AppRole =
    roles.includes("admin")
      ? "admin"
      : roles.includes("dono")
      ? "dono"
      : roles.includes("funcionario")
      ? "funcionario"
      : roles