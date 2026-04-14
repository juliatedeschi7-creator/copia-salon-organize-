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

        // 🔥 TIMEOUT ANTI-TRAVA (mobile safe)
        const timeout = new Promise((resolve) =>
          setTimeout(() => resolve({ session: null }), 2500)
        );

        const sessionPromise = supabase.auth.getSession();

        const result: any = await Promise.race([
          sessionPromise,
          timeout,
        ]);

        if (!mounted) return;

        const session = result?.data?.session ?? null;
        const currentUser = session?.user ?? null;

        // 🔓 NÃO LOGADO (FORÇA SAIR DO LOADING)
        if (!currentUser) {
          setUser(null);
          setProfile(null);
          setProfileError(false);
          setIsLoading(false);
          return;
        }

        setUser(currentUser);

        // 🔥 PROFILE COM TIMEOUT TAMBÉM
        const profileTimeout = new Promise((resolve) =>
          setTimeout(() => resolve({ data: null, error: null }), 2500)
        );

        const profilePromise = supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        const profileResult: any = await Promise.race([
          profilePromise,
          profileTimeout,
        ]);

        if (!mounted) return;

        if (!profileResult || profileResult.error) {
          setProfile(null);
          setProfileError(true);
        } else {
          setProfile(profileResult.data || null);
          setProfileError(false);
        }
      } catch (err) {
        console.error("Auth error:", err);

        if (!mounted) return;

        setUser(null);
        setProfile(null);
        setProfileError(true);
      } finally {
        if (mounted) setIsLoading(false); // 🔥 NUNCA trava
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
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
