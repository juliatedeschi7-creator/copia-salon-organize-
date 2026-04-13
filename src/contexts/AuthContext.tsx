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

    // 🔥 pega sessão imediatamente (sem await travando)
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;

      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      setIsLoading(false);

      // 🔥 busca profile depois (não bloqueia app)
      if (sessionUser) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", sessionUser.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (!mounted) return;

            if (error) {
              console.error(error);
              setProfileError(true);
              setProfile(null);
            } else {
              setProfile(data || null);
              setProfileError(false);
            }
          });
      }
    });

    // 🔄 listener REAL (esse resolve 90% dos bugs)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        const sessionUser = session?.user ?? null;

        setUser(sessionUser);

        if (!sessionUser) {
          setProfile(null);
          return;
        }

        supabase
          .from("profiles")
          .select("*")
          .eq("id", sessionUser.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (!mounted) return;

            if (error) {
              setProfileError(true);
              setProfile(null);
            } else {
              setProfile(data || null);
              setProfileError(false);
            }
          });
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
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
