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
  initialized: boolean;
  createSalon: (name: string) => Promise<void>;
  updateSalon: (updates: Partial<Salon>) => Promise<void>;
  refetch: () => Promise<void>;
}

const SalonContext = createContext<SalonContextType>({
  salon: null,
  isLoading: true,
  initialized: false,
  createSalon: async () => {},
  updateSalon: async () => {},
  refetch: async () => {},
});

export const useSalon = () => useContext(SalonContext);

export const SalonProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchSalon = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setSalon(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Primeiro tenta pegar membership
      const { data: membership, error: membershipErr } = await supabase
        .from("salon_members")
        .select("salon_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipErr) console.error("❌ Membership fetch error:", membershipErr);

      let salonData;

      if (!membership?.salon_id) {
        // Usuário antigo: busca salão onde é dono
        const { data, error } = await supabase
          .from("salons")
          .select("*")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (error) console.error("❌ Salon fetch (owner) error:", error);
        salonData = data;
      } else {
        // Usuário normal: pega pelo membership
        const { data, error } = await supabase
          .from("salons")
          .select("*")
          .eq("id", membership.salon_id)
          .maybeSingle();

        if (error) console.error("❌ Salon fetch error:", error);
        salonData = data;
      }

      setSalon(salonData ?? null);
    } catch (e) {
      console.error("❌ Unexpected fetch error:", e);
      setSalon(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    const checkSessionAndFetch = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          setSalon(null);
          setIsLoading(false);
          setInitialized(true);
          return;
        }

        await fetchSalon();
      } catch (e) {
        console.error("❌ Session fetch error:", e);
        setSalon(null);
      } finally {
        setIsLoading(false);
        setInitialized(true);
      }
    };

    checkSessionAndFetch();
  }, [fetchSalon]);

  const createSalon = async (name: string) => {
    if (!user?.id) {
      toast.error("Aguarde e tente novamente");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast.error("Sessão expirada, faça login novamente");
        return;
      }

      // Checa duplicidade
      const { data: existingSalon } = await supabase
        .from("salons")
        .select("id")
        .eq("owner_id", session.user.id)
        .maybeSingle();

      if (existingSalon) {
        toast.error("Você já possui um salão!");
        return;
      }

      // Cria salão
      const { data: salonRow, error: salonErr } = await supabase
        .from("salons")
        .insert({ name, owner_id: session.user.id })
        .select("*")
        .single();

      if (salonErr || !salonRow) {
        toast.error("Erro ao criar salão: " + salonErr?.message);
        return;
      }

      // Cria membership
      const { error: memberErr } = await supabase
        .from("salon_members")
        .insert({ salon_id: salonRow.id, user_id: session.user.id, role: "dono" });

      if (memberErr) {
        toast.error("Erro ao vincular usuário");
        return;
      }

      setSalon(salonRow as Salon);
      toast.success("Salão criado com sucesso!");
      await fetchSalon();
    } catch (e: any) {
      console.error("❌ Unexpected create error:", e);
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
      toast.error("Erro ao atualizar");
      return;
    }

    setSalon((prev) => (prev ? { ...prev, ...updates } : prev));
    toast.success("Atualizado com sucesso!");
  };

  return (
    <SalonContext.Provider
      value={{ salon, isLoading, initialized, createSalon, updateSalon, refetch: fetchSalon }}
    >
      {children}
    </SalonContext.Provider>
  );
};