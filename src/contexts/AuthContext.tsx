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

    const init = async () => {
      try {
        setIsLoading(true);

        // 🔥 timeout anti-trava (2s)
        const timeout = new Promise((resolve) =>
          setTimeout(() => resolve(null), 2000)
        );

        const result: any = await Promise.race([
          supabase.auth.getSession(),
          timeout,
        ]);

        if (!mounted) return;

        const session = result?.data?.session ?? null;
        const currentUser = session?.user ?? null;

        // 🔓 NÃO LOGADO
        if (!currentUser) {
          setUser(null);
          setProfile(null);
          setProfileError(false);
          setIsLoading(false);
          return;
        }

        setUser(currentUser);

        // 🔥 busca profile (sem travar app)
        supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (!mounted) return;

            if (error) {
              console.error("Erro profile:", error);
              setProfile(null);
              setProfileError(true);
            } else {
              setProfile(data || null);
              setProfileError(false);
            }
          })
          .finally(() => {
            if (mounted) setIsLoading(false);
          });
      } catch (err) {
        console.error("Erro auth:", err);

        if (!mounted) return;

        setUser(null);
        setProfile(null);
        setProfileError(true);
        setIsLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      if (!mounted) return;
      init();
    });

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
