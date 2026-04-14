import { Routes, Route } from "react-router-dom";

import AppLayout from "@/components/AppLayout";

import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import AgendaPage from "@/pages/AgendaPage";
import ClientesPage from "@/pages/ClientesPage";
import ServicesPage from "@/pages/ServicesPage";

import PendingApprovalPage from "@/pages/PendingApprovalPage";
import BlockedAccessPage from "@/pages/BlockedAccessPage";

import { useAuth } from "@/contexts/AuthContext";

export default function AppRoutes() {
  const { isAuthenticated, profile, isApproved, role } = useAuth();

  // 🔓 não logado
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  // ❌ erro ou bloqueio
  if (profile?.status === "rejected") {
    return (
      <Routes>
        <Route path="*" element={<BlockedAccessPage />} />
      </Routes>
    );
  }

  // ⏳ pendente
  if (!isApproved && role !== "admin") {
    return (
      <Routes>
        <Route path="*" element={<PendingApprovalPage />} />
      </Routes>
    );
  }

  // ✅ app normal
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/servicos" element={<ServicesPage />} />
      </Route>
    </Routes>
  );
}
