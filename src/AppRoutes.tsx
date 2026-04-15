import { Routes, Route } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSalon } from "@/contexts/SalonContext";

import AppLayout from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import NotFound from "@/pages/NotFound";

export default function AppRoutes() {
  const { isAuthenticated, user } = useAuth();
  const { salon } = useSalon();

  // NÃO LOGADO → LOGIN
  if (!isAuthenticated || !user) {
    return (
      <Routes>
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  // LOGADO → APP
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
