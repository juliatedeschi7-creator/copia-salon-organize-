import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Salon {
  id: string;
  owner_id: string;
  name: string;
}

interface SalonContextType {
  salon: Salon | null;
  isLoading: boolean;
}

const SalonContext = createContext<SalonContextType>({
  salon: null,
  isLoading: false,
});

export const useSalon = () => useContext(SalonContext);

export const SalonProvider = ({ children }: { children: ReactNode }) => {
  const { user, role, isAuthenticated } = useAuth();

  const [salon, setSalon] = useState<Salon | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchSalon = async () => {
      try {
        // 🔥 NÃO LOGADO → NÃO FAZ NADA
        if (!isAuthenticated || !user) {
          setSalon(null);
          return;
        }

        // 🔥 CLIENTE/ADMIN NÃO TEM SALÃO
        if (role === "cliente" || role === "admin") {
          setSalon(null);
          return;
        }

        setIsLoading(true);

        const { data: membership } = await supabase
          .from("salon_members")
          .select("salon_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (!mounted) return;

        if (!membership?.salon_id) {
          setSalon(null);
          return;
        }

        const { data: salonData } = await supabase
          .from("salons")
          .select("id, owner_id, name")
          .eq("id", membership.salon_id)
          .maybeSingle();

        if (!mounted) return;

        setSalon(salonData || null);
      } catch (err) {
        console.error("Erro salon:", err);
        setSalon(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchSalon();

    return () => {
      mounted = false;
    };
  }, [user?.id, role, isAuthenticated]);

  return (
    <SalonContext.Provider value={{ salon, isLoading }}>
      {children}
    </SalonContext.Provider>
  );
};
