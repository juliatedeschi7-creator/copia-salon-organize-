import { Routes, Route } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSalon } from "@/contexts/SalonContext";

import AppLayout from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import PendingApprovalPage from "@/pages/PendingApprovalPage";
import CreateSalonPage from "@/pages/CreateSalonPage";
import DashboardPage from "@/pages/DashboardPage";
import NotFound from "@/pages/NotFound";

export default function AppRoutes() {
  const { user, role, isApproved } = useAuth();
  const { salon, isLoading } = useSalon();  // 👈 adiciona isLoading

  // 🔓 NÃO LOGADO → LOGIN
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  // ⏳ AGUARDA SALÃO CARREGAR  👈 bloco novo
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
      </div>
    );
  }

  // ⏳ NÃO APROVADO
  if (role !== "admin" && !isApproved) {
    return (
      <Routes>
        <Route path="*" element={<PendingApprovalPage />} />
      </Routes>
    );
  }

  // 🏪 DONO SEM SALÃO
  if (role === "dono" && !salon) {
    return (
      <Routes>
        <Route path="*" element={<CreateSalonPage />} />
      </Routes>
    );
  }

  // ✅ APP NORMAL
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
