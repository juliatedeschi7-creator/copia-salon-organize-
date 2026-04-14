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
}

const SalonContext = createContext<SalonContextType>({
  salon: null,
});

export const useSalon = () => useContext(SalonContext);

export const SalonProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated, role } = useAuth();
  const [salon, setSalon] = useState<Salon | null>(null);

  useEffect(() => {
    const fetchSalon = async () => {
      try {
        // 🔥 NÃO LOGADO → SEM SALÃO
        if (!isAuthenticated || !user) {
          setSalon(null);
          return;
        }

        // 🔥 cliente/admin não usam salão
        if (role === "cliente" || role === "admin") {
          setSalon(null);
          return;
        }

        const { data: membership } = await supabase
          .from("salon_members")
          .select("salon_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!membership?.salon_id) {
          setSalon(null);
          return;
        }

        const { data: salonData } = await supabase
          .from("salons")
          .select("id, owner_id, name")
          .eq("id", membership.salon_id)
          .maybeSingle();

        setSalon(salonData || null);
      } catch (err) {
        console.error("Erro salon:", err);
        setSalon(null);
      }
    };

    fetchSalon();
  }, [user?.id, isAuthenticated, role]);

  return (
    <SalonContext.Provider value={{ salon }}>
      {children}
    </SalonContext.Provider>
  );
};
