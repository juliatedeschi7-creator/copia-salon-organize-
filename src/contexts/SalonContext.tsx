import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Salon {
  id: string;
  owner_id: string;
  name: string;
}

interface SalonContextType {
  salon: Salon | null | undefined;
  isLoading: boolean;
  createSalon: (name: string) => Promise<void>;
  updateSalon: (updates: Partial<Salon>) => Promise<void>;
  refetch: () => Promise<void>;
}

const SalonContext = createContext<SalonContextType>({} as any);

export const useSalon = () => useContext(SalonContext);

export const SalonProvider = ({ children }: { children: ReactNode }) => {
  const { user, role } = useAuth();

  const [salon, setSalon] = useState<Salon | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSalon = async () => {
    if (!user) {
      setSalon(null);
      return;
    }

    if (role === "cliente" || role === "admin") {
      setSalon(null);
      return;
    }

    try {
      setIsLoading(true);

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

      setSalon(salonData ?? null);
    } catch (err) {
      console.error("Salon error:", err);
      setSalon(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchSalon();
    } else {
      setSalon(null);
    }
  }, [user?.id, role]);

  const createSalon = async (name: string) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("salons")
      .insert({ name, owner_id: user.id })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar salão");
      return;
    }

    await supabase.from("salon_members").insert({
      salon_id: data.id,
      user_id: user.id,
      role: "dono",
    });

    setSalon(data);
    toast.success("Salão criado!");
  };

  const updateSalon = async (updates: Partial<Salon>) => {
    if (!salon) return;

    const { error } = await supabase
      .from("salons")
      .update(updates)
      .eq("id", salon.id);

    if (error) {
      toast.error("Erro ao atualizar");
      return;
    }

    setSalon((prev) => (prev ? { ...prev, ...updates } : prev));
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
