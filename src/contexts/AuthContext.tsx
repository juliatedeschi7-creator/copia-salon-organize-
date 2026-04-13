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
  const [profileError, setProfileError] = useState(false);

  // 🔥 NUNCA MAIS TRAVA
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    // 🔥 NÃO ESPERA NADA
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (!mounted) return;

        const sessionUser = data.session?.user ?? null;

        setUser(sessionUser);

        // 🔥 busca profile SEM travar app
        if (sessionUser) {
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
      } catch (err) {
        console.error(err);
        if (!mounted) return;

        setUser(null);
        setProfile(null);
        setProfileError(true);
      }
    };

    init();

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
        isLoading, // 🔥 sempre false → nunca trava
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
