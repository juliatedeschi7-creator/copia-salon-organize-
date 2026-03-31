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

export const useSalon = () => useContext(SalonContext);

export const SalonProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSalon = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setSalon(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      console.log("📡 Fetching membership for:", user.id);

      const { data: membership, error: membershipErr } = await supabase
        .from("salon_members")
        .select("salon_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipErr) {
        console.error("❌ Membership error:", membershipErr);
        setSalon(null);
        return;
      }

      if (!membership?.salon_id) {
        console.warn("⚠️ No salon membership found");
        setSalon(null);
        return;
      }

      console.log("✅ Membership OK:", membership.salon_id);

      const { data: salonData, error: salonErr } = await supabase
        .from("salons")
        .select("*")
        .eq("id", membership.salon_id)
        .maybeSingle();

      if (salonErr) {
        console.error("❌ Salon fetch error:", salonErr);
        setSalon(null);
        return;
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
    fetchSalon();
  }, [fetchSalon]);

  const createSalon = async (name: string) => {
    if (!user) return;

    try {
      console.log("🏢 Creating salon:", name);

      // 1. criar salão
      const { data: salonRow, error: salonErr } = await supabase
        .from("salons")
        .insert({ name, owner_id: user.id })
        .select("*")
        .single();

      if (salonErr || !salonRow) {
        console.error("❌ Salon creation failed:", salonErr);
        toast.error("Erro ao criar salão");
        return;
      }

      console.log("✅ Salon created:", salonRow.id);

      // 2. criar membership (UPSERT 🔥)
      const { error: memberErr } = await supabase
        .from("salon_members")
        .upsert({
          salon_id: salonRow.id,
          user_id: user.id,
          role: "dono",
        });

      if (memberErr) {
        console.error("❌ Membership failed:", memberErr);
        toast.error("Erro ao vincular usuário ao salão");
        return;
      }

      console.log("✅ Membership created");

      // 🔥 FORÇA ESTADO LOCAL IMEDIATO
      setSalon(salonRow as Salon);

      toast.success("Salão criado com sucesso!");

      // 🔥 delay pequeno pra garantir persistência no banco
      setTimeout(() => {
        fetchSalon();
      }, 500);

    } catch (e) {
      console.error("❌ Unexpected create error:", e);
      toast.error("Erro inesperado ao criar salão");
    }
  };

  const updateSalon = async (updates: Partial<Salon>) => {
    if (!salon) return;

    const { error } = await supabase
      .from("salons")
      .update(updates)
      .eq("id", salon.id);

    if (error) {
      console.error("❌ Update error:", error);
      toast.error("Erro ao atualizar");
      return;
    }

    setSalon((prev) => (prev ? { ...prev, ...updates } : prev));
    toast.success("Atualizado com sucesso!");
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