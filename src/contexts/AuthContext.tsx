import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // 🔥 pega sessão
        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? null;

        if (!mounted) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        // 🔓 se não tem usuário → NÃO trava
        if (!currentUser) {
          setProfile(null);
          return;
        }

        // 🔥 busca perfil
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (!mounted) return;

        setProfile(profileData ?? null);
      } catch (err) {
        console.error("Auth erro:", err);
        setUser(null);
        setProfile(null);
      }
    };

    init();

    // 🔥 listener simples (sem re-init bugado)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isApproved =
    profile?.status === "approved" || profile?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,
        isApproved,
        role: profile?.role ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
