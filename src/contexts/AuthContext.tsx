import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "dono" | "funcionario" | "cliente" | null;

interface AuthContextType {
  user: any;
  profile: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  profileLoaded: boolean;
  profileError: boolean;
  isApproved: boolean;
  role: Role;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!mounted) return;

      setIsLoading(true);

      try {
        // 🔥 timeout pra nunca travar
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { session: null } }), 4000)
          ),
        ]);

        const session = (result as any)?.data?.session;

        // 🔓 NÃO LOGADO
        if (!session?.user) {
          if (!mounted) return;

          setUser(null);
          setProfile(null);
          setProfileError(false);
          setProfileLoaded(true);
          return;
        }

        const currentUser = session.user;

        if (!mounted) return;
        setUser(currentUser);

        // 🔥 BUSCAR PROFILE
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.error("Erro ao carregar profile:", error);
          setProfile(null);
          setProfileError(true);
        } else {
          setProfile(profileData || null);
          setProfileError(false);
        }

        setProfileLoaded(true);
      } catch (err) {
        console.error("Erro geral Auth:", err);

        if (!mounted) return;

        // 🔥 fallback TOTAL (nunca trava)
        setUser(null);
        setProfile(null);
        setProfileError(true);
        setProfileLoaded(true);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    // 🔄 escuta login/logout
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      init();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const role: Role = profile?.role ?? null;

  // 🔥 ADMIN SEMPRE LIBERADO
  const isApproved =
    role === "admin" || profile?.status === "approved";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,
        isLoading,
        profileLoaded,
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
