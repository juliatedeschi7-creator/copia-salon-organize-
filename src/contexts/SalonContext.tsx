import React, { createContext, useContext } from "react";
import { useAuth } from "./AuthContext";

interface SalonContextType {
  salon: any | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const SalonContext = createContext<SalonContextType>({
  salon: null,
  isLoading: true,
  refetch: async () => {},
});

export const SalonProvider = ({ children }: { children: React.ReactNode }) => {
  const { salon, isLoading } = useAuth();

  const refetch = async () => {
    const res = await fetch("/api/session");
    const data = await res.json();
    console.log("Refetch salon:", data.salon);
  };

  return (
    <SalonContext.Provider value={{ salon, isLoading, refetch }}>
      {children}
    </SalonContext.Provider>
  );
};

export const useSalon = () => useContext(SalonContext);