import { Routes, Route } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// páginas
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";

export default function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  // 🔥 nunca trava infinito
  if (isLoading) {
    return <div style={{ padding: 20 }}>Carregando...</div>;
  }

  return (
    <Routes>
      {!isAuthenticated ? (
        <Route path="*" element={<AuthPage />} />
      ) : (
        <Route path="/" element={<DashboardPage />} />
      )}
    </Routes>
  );
}
