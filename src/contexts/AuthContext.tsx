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
      setIsLoading(true);

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      // 🔓 usuário não logado
      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setProfileLoaded(true);
        setIsLoading(false);
        return;
      }

      const currentUser = session.user;
      setUser(currentUser);

      // 🔥 buscar profile
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (error || !profileData) {
        console.error("Erro ao carregar profile:", error);
        setProfile(null);
        setProfileError(true);
        setProfileLoaded(true);
        setIsLoading(false);
        return;
      }

      setProfile(profileData);
      setProfileError(false);
      setProfileLoaded(true);
      setIsLoading(false);
    };

    init();

    // 🔄 escuta mudanças de auth (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      init();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 🎯 role do usuário
  const role: Role = profile?.role ?? null;

  // 🎯 status de aprovação
  const isApproved = profile?.status === "approved";

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

// ✅ hook de uso
export const useAuth = () => useContext(AuthContext);
