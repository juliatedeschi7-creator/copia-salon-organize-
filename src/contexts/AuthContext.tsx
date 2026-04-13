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
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          console.error("Erro getUser:", error);
        }

        const currentUser = data?.user;

        // 🔓 NÃO LOGADO
        if (!currentUser) {
          if (!mounted) return;

          setUser(null);
          setProfile(null);
          setProfileError(false);
          setProfileLoaded(true);
          return;
        }

        if (!mounted) return;
        setUser(currentUser);

        // 🔥 BUSCA PROFILE
        const { data: profileData, error: profileErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (!mounted) return;

        if (profileErr) {
          console.error("Erro profile:", profileErr);
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

        // 🔥 fallback total (nunca trava)
        setUser(null);
        setProfile(null);
        setProfileError(true);
        setProfileLoaded(true);
      } finally {
        // 🔥 ESSENCIAL → nunca deixar loading infinito
        if (mounted) setIsLoading(false);
      }
    };

    // 🚀 primeira execução
    init();

    // 🔄 escuta login/logout REAL (sem loop infinito)
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        init();
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const role: Role = profile?.role ?? null;

  // 🔥 ADMIN sempre aprovado
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
