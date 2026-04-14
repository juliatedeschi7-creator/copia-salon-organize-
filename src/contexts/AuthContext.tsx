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

  // ✅ NOVO: controle correto de inicialização da auth
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setIsLoading(true);

        // 🔥 pega sessão do Supabase (fonte real da verdade)
        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? null;

        if (!mounted) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        // 🔥 SEM USUÁRIO
        if (!currentUser) {
          setProfile(null);
          setProfileError(false);
          setAuthReady(true);
          setIsLoading(false);
          return;
        }

        // 🔥 busca profile
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          setProfileError(true);
          setProfile(null);
        } else {
          setProfile(profileData ?? null);
          setProfileError(false);
        }
      } catch (err) {
        console.error("Auth error:", err);

        if (!mounted) return;

        setUser(null);
        setProfile(null);
        setProfileError(true);
      } finally {
        if (mounted) {
          setAuthReady(true); // 🔥 IMPORTANTE: nunca deixa travado
          setIsLoading(false);
        }
      }
    };

    init();

    // 🔥 listener de auth (login/logout em tempo real)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);

      // revalida profile sem travar UI
      setTimeout(() => {
        init();
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
        isLoading: !authReady, // 🔥 FIX PRINCIPAL
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
