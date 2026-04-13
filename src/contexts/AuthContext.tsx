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

        // ✅ CORREÇÃO AQUI (não trava nunca)
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const currentUser = session?.user ?? null;

        if (!mounted) return;

        // 🔓 NÃO LOGADO
        if (!currentUser) {
          setUser(null);
          setProfile(null);
          setProfileError(false);
          return;
        }

        setUser(currentUser);

        // 🔥 buscar profile
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.error("Erro profile:", error);
          setProfile(null);
          setProfileError(true);
        } else {
          setProfile(profileData || null);
          setProfileError(false);
        }
      } catch (err) {
        console.error("Erro auth:", err);

        if (!mounted) return;

        setUser(null);
        setProfile(null);
        setProfileError(true);
      } finally {
        if (mounted) setIsLoading(false); // 🔥 nunca trava
      }
    };

    init();

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
