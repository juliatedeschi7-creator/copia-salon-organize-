import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "dono" | "funcionario" | "cliente" | null;

interface AuthContextType {
  user: any;
  profile: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  isApproved: boolean;
  role: Role;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // 🔥 nunca trava app
  const [loading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? null;

        if (!mounted) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (!currentUser) {
          setProfile(null);
          return;
        }

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (!mounted) return;

        setProfile(profileData ?? null);
      } catch (err) {
        console.error("Auth error:", err);
        if (!mounted) return;
        setUser(null);
        setProfile(null);
      }
    };

    init();

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

  // 🔥 logout corrigido
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const role: Role = profile?.role ?? null;

  const isApproved =
    role === "admin" || profile?.status === "approved";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,

        // 🔥 nunca trava
        isLoading: false,

        isApproved,
        role,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
