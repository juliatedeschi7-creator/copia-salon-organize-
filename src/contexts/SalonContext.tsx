import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { toast } from "sonner";

interface Salon {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  logo_url?: string | null;
  client_link?: string;
  primary_color?: string;
  accent_color?: string;
  notifications_enabled?: boolean;
  working_hours?: any;
  reminder_hours?: number[];
  created_at?: string;
  updated_at?: string;
}

interface SalonContextType {
  salon: Salon | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const SalonContext = createContext<SalonContextType>({
  salon: null,
  isLoading: true,
  refetch: async () => {},
});

export const SalonProvider = ({ children }: { children: ReactNode }) => {
  const [salon, setSalon] = useState<Salon | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSalon = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/session"); // endpoint seguro do backend
      const data = await res.json();

      if (data?.salon) {
        setSalon(data.salon);
      } else {
        setSalon(null);
      }
    } catch (err: any) {
      console.error("Erro ao buscar salão:", err);
      setSalon(null);
      toast.error("Erro ao carregar dados do salão");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSalon();
  }, [fetchSalon]);

  return (
    <SalonContext.Provider
      value={{
        salon,
        isLoading,
        refetch: fetchSalon,
      }}
    >
      {children}
    </SalonContext.Provider>
  );
};

export const useSalon = () => useContext(SalonContext);