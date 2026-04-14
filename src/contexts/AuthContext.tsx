import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "dono" | "funcionario" | "cliente" | null;

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 🔥 TIMEOUT DE SEGURANÇA (NUNCA TRAVA APP)
    const safetyTimeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2000);

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!mounted) return;

      setProfile(profileData ?? null);
      setLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  const role: Role = profile?.role ?? null;

  const isApproved = role === "admin" || profile?.status === "approved";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,
        isLoading: loading,
        isApproved,
        role,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
