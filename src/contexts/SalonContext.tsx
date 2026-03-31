import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
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

// Hook para usar o contexto
export const useSalon = () => {
  const context = useContext(SalonContext);
  if (!context) throw new Error("useSalon deve ser usado dentro do SalonProvider");
  return context;
};

// Provider
export const SalonProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSalon = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setSalon(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const { data: membership, error: membershipErr } = await supabase
        .from("salon_members")
        .select("salon_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipErr) throw membershipErr;
      if (!membership?.salon_id) {
        setSalon(null);
        return;
      }

      const { data: salonData, error: salonErr } = await supabase
        .from("salons")
        .select("*")
        .eq("id", membership.salon_id)
        .maybeSingle();

      if (salonErr) throw salonErr;

      setSalon(salonData ?? null);
    } catch (e: any) {
      console.error("❌ FetchSalon error:", e);
      setSalon(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    fetchSalon();
  }, [fetchSalon]);

  const createSalon = async (name: string) => {
    if (!user?.id) {
      toast.error("Aguarde um momento e tente novamente");
      return;
    }

    try {
      // Bloqueio de duplicidade
      const { data: existingSalon } = await supabase
        .from("salons")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (existingSalon) {
        toast.error("Você já possui um salão!");
        return;
      }

      // Criação do salão
      const { data: salonRow, error: salonErr } = await supabase
        .from("salons")
        .insert({ name, owner_id: user.id })
        .select("*")
        .single();

      if (salonErr || !salonRow) {
        toast.error("Erro ao criar salão: " + salonErr?.message);
        return;
      }

      // Criação do membership
      const { error: memberErr } = await supabase
        .from("salon_members")
        .insert({ salon_id: salonRow.id, user_id: user.id, role: "dono" });

      if (memberErr) {
        toast.error("Erro ao vincular usuário");
        return;
      }

      setSalon(salonRow as Salon);
      toast.success("Salão criado com sucesso!");
      await fetchSalon();
    } catch (e: any) {
      console.error("❌ CreateSalon error:", e);
      toast.error("Erro: " + (e?.message || JSON.stringify(e)));
    }
  };

  const updateSalon = async (updates: Partial<Salon>) => {
    if (!salon) return;

    const { error } = await supabase
      .from("salons")
      .update(updates)
      .eq("id", salon.id);

    if (error) {
      console.error("❌ UpdateSalon error:", error);
      toast.error("Erro ao atualizar");
      return;
    }

    setSalon((prev) => (prev ? { ...prev, ...updates } : prev));
    toast.success("Atualizado com sucesso!");
  };

  return (
    <SalonContext.Provider value={{ salon, isLoading, createSalon, updateSalon, refetch: fetchSalon }}>
      {children}
    </SalonContext.Provider>
  );
};