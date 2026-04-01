import React, { createContext, useContext, useState, useEffect } from "react";

interface AuthContextType {
  user: any | null;
  salon: any | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  salon: null,
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState(null);
  const [salon, setSalon] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      setIsLoading(true);
      const res = await fetch("/api/session");
      const data = await res.json();
      setUser(data.user);
      setSalon(data.salon);
      setIsLoading(false);
    };
    fetchSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, salon, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);