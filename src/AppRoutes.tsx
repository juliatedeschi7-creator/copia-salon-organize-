import { Routes, Route } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import AgendaPage from "@/pages/AgendaPage";
import ClientesPage from "@/pages/ClientesPage";
import ServicesPage from "@/pages/ServicesPage";

import AppLayout from "@/components/AppLayout";

export default function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  // 🔥 NUNCA trava render
  if (isLoading) {
    return <div style={{ padding: 20 }}>Carregando...</div>;
  }

  return (
    <Routes>
      {!isAuthenticated ? (
        <Route path="*" element={<AuthPage />} />
      ) : (
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/servicos" element={<ServicesPage />} />
        </Route>
      )}
    </Routes>
  );
}
