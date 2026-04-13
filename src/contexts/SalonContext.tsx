import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Salon {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  logo_url: string | null;
  client_link: string;
  primary_color: string;
  accent_color: string;
  notifications_enabled: boolean;
  working_hours: any;
  reminder_hours: number[];
  created_at: string;
  updated_at: string;
}

interface SalonContextType {
  salon: Salon | null;
  isLoading: boolean;
  createSalon: (name: string) => Promise<void>;
  updateSalon: (updates: Partial<Salon>) => Promise<void>;
  refetch: () => Promise<void>;
}

const SalonContext = createContext<SalonContextType>({
  salon: null,
  isLoading: true,
  createSalon: async () => {},
  updateSalon: async () => {},
  refetch: async () => {},
});

export const useSalon = () => useContext(SalonContext);

export const SalonProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, role, isAuthenticated } = useAuth();

  const [salon, setSalon] = useState<Salon | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSalon = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setSalon(null);
      setIsLoading(false);
      return;
    }

    if (role !== "dono" && role !== "funcionario") {
      setSalon(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // 🔥 pega todos os salões do usuário e escolhe o mais recente
      const { data: memberships, error: membershipErr } = await supabase
        .from("salon_members")
        .select("salon_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (membershipErr) {
        console.error("membership error:", membershipErr);
        setSalon(null);
        return;
      }

      const membership = memberships?.[0];

      if (!membership?.salon_id) {
        setSalon(null);
        return;
      }

      const { data: salonData, error: salonErr } = await supabase
        .from("salons")
        .select("*")
        .eq("id", membership.salon_id)
        .maybeSingle();

      if (salonErr) {
        console.error("salon error:", salonErr);
        setSalon(null);
        return;
      }

      setSalon((salonData ?? null) as Salon | null);
    } catch (err) {
      console.error("fetchSalon error:", err);
      setSalon(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, role]);

  useEffect(() => {
    fetchSalon();
  }, [fetchSalon]);

  const createSalon = async (name: string) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("salons")
      .insert({ name, owner_id: user.id })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar salão: " + error.message);
      return;
    }

    await supabase.from("salon_members").insert({
      salon_id: data.id,
      user_id: user.id,
      role: "dono",
    });

    setSalon(data as Salon);
    toast.success("Salão criado com sucesso!");
  };

  const updateSalon = async (updates: Partial<Salon>) => {
    if (!salon) return;

    const { error } = await supabase
      .from("salons")
      .update(updates)
      .eq("id", salon.id);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }

    setSalon((prev) => (prev ? { ...prev, ...updates } : prev));
    toast.success("Configurações salvas!");
  };

  return (
    <SalonContext.Provider
      value={{
        salon,
        isLoading,
        createSalon,
        updateSalon,
        refetch: fetchSalon,
      }}
    >
      {children}
    </SalonContext.Provider>
  );
};
