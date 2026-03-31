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
      console.warn("⚠️ User not authenticated, skipping salon fetch");
      setSalon(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Always try membership; don't depend on role being loaded correctly.
      console.log("📡 Fetching salon membership for user:", user.id);
      const { data: membership, error: membershipErr } = await supabase
        .from("salon_members")
        .select("salon_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (membershipErr) {
        console.error("❌ Error fetching salon membership:", membershipErr);
        console.debug("Membership Error Details:", {
          code: membershipErr.code,
          message: membershipErr.message,
          status: membershipErr.status,
          hint: membershipErr.hint,
        });
        setSalon(null);
        setIsLoading(false);
        return;
      }

      if (!membership?.salon_id) {
        console.warn("⚠️ User has NO salon membership - redirecting to CreateSalonPage");
        console.debug("Membership data:", membership);
        setSalon(null);
        setIsLoading(false);
        return;
      }

      console.log("✅ Found salon membership:", membership.salon_id);

      const { data: salonData, error: salonErr } = await supabase
        .from("salons")
        .select("*")
        .eq("id", membership.salon_id)
        .maybeSingle();

      if (salonErr) {
        console.error("❌ Error fetching salon:", salonErr);
        console.debug("Salon Error Details:", {
          code: salonErr.code,
          message: salonErr.message,
          status: salonErr.status,
          hint: salonErr.hint,
        });
        setSalon(null);
        setIsLoading(false);
        return;
      }

      console.log("✅ Salon fetched successfully:", salonData?.name);
      setSalon((salonData ?? null) as Salon | null);
    } catch (e) {
      console.error("❌ Unexpected error fetching salon:", e);
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

    console.log("🏢 Creating new salon:", name);

    const { data, error } = await supabase
      .from("salons")
      .insert({ name, owner_id: user.id })
      .select()
      .single();

    if (error) {
      console.error("❌ Error creating salon:", error);
      toast.error("Erro ao criar salão: " + error.message);
      return;
    }

    console.log("✅ Salon created:", data);

    await supabase.from("salon_members").insert({ salon_id: data.id, user_id: user.id, role: "dono" });

    setSalon(data as Salon);
    toast.success("Salão criado com sucesso!");
  };

  const updateSalon = async (updates: Partial<Salon>) => {
    if (!salon) return;

    console.log("📝 Updating salon:", updates);

    const { error } = await supabase.from("salons").update(updates).eq("id", salon.id);

    if (error) {
      console.error("❌ Error updating salon:", error);
      toast.error("Erro ao salvar: " + error.message);
      return;
    }

    setSalon((prev) => (prev ? { ...prev, ...updates } : prev));
    toast.success("Configurações salvas!");
  };

  return (
    <SalonContext.Provider value={{ salon, isLoading, createSalon, updateSalon, refetch: fetchSalon }}>
      {children}
    </SalonContext.Provider>
  );
};