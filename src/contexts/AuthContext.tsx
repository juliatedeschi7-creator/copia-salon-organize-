import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "dono" | "funcionario" | "cliente" | null;

interface AuthContextType {
  user: any;
  profile: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  profileError: boolean;
  isApproved: boolean;
  role: Role;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        setIsLoading(true);

        // 🔥 pega sessão atual (safe)
        const { data, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("Session error:", error);
          setUser(null);
          setProfile(null);
          setProfileError(true);
          setIsLoading(false);
          return;
        }

        const session = data?.session;
        const currentUser = session?.user ?? null;

        if (!currentUser) {
          setUser(null);
          setProfile(null);
          setProfileError(false);
          setIsLoading(false);
          return;
        }

        setUser(currentUser);

        // 🔥 busca profile (seguro)
        const { data: profileData, error: profileErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (!mounted) return;

        if (profileErr) {
          console.error("Profile error:", profileErr);
          setProfile(null);
          setProfileError(true);
        } else {
          setProfile(profileData ?? null);
          setProfileError(false);
        }
      } catch (err) {
        console.error("Auth crash:", err);

        if (!mounted) return;

        setUser(null);
        setProfile(null);
        setProfileError(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    // 🚀 inicializa uma vez
    loadSession();

    // 🔥 listener de auth (SEM loop infinito)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setUser(session?.user ?? null);

      // evita race condition com getSession
      setTimeout(() => {
        loadSession();
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const role: Role = profile?.role ?? null;

  const isApproved =
    role === "admin" || profile?.status === "approved";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,
        isLoading,
        profileError,
        isApproved,
        role,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
