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
    const init = async () => {
      try {
        setIsLoading(true);

        const { data } = await supabase.auth.getSession();
        const session = data.session;

        // 🔓 NÃO LOGADO
        if (!session?.user) {
          setUser(null);
          setProfile(null);
          setProfileError(false);
          setProfileLoaded(true);
          return;
        }

        const currentUser = session.user;
        setUser(currentUser);

        // 🔥 BUSCAR PROFILE
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (error || !profileData) {
          console.error("Erro ao carregar profile:", error);
          setProfile(null);
          setProfileError(true);
        } else {
          setProfile(profileData);
          setProfileError(false);
        }

        setProfileLoaded(true);
      } catch (err) {
        console.error("Erro geral:", err);
        setProfileError(true);
        setProfileLoaded(true);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      init();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const role: Role = profile?.role ?? null;

  // 🔥 ADMIN SEMPRE APROVADO
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
