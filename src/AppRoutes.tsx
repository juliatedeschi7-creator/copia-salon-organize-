import { Routes, Route } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSalon } from "@/contexts/SalonContext";

// páginas públicas
import AuthPage from "@/pages/AuthPage";
import ClientInvitePage from "@/pages/ClientInvitePage";
import TeamInvitePage from "@/pages/TeamInvitePage";

// páginas internas
import AppLayout from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import AgendaPage from "@/pages/AgendaPage";
import ServicesPage from "@/pages/ServicesPage";
import ClientesPage from "@/pages/ClientesPage";
import AnamnesesPage from "@/pages/AnamnesesPage";
import PacotesPage from "@/pages/PacotesPage";
import EstoquePage from "@/pages/EstoquePage";
import FinanceiroPage from "@/pages/FinanceiroPage";
import SettingsPage from "@/pages/SettingsPage";
import NotificationsPage from "@/pages/NotificationsPage";
import AdminPage from "@/pages/AdminPage";
import ContasPage from "@/pages/ContasPage";
import MySchedulePage from "@/pages/MySchedulePage";
import ClientSchedulePage from "@/pages/ClientSchedulePage";
import ServicesShowcasePage from "@/pages/ServicesShowcasePage";

// estados
import PendingApprovalPage from "@/pages/PendingApprovalPage";
import BlockedAccessPage from "@/pages/BlockedAccessPage";
import CreateSalonPage from "@/pages/CreateSalonPage";
import NotFound from "@/pages/NotFound";

export default function AppRoutes() {
  const { isAuthenticated, role, profile } = useAuth();
  const { salon } = useSalon();

  // 🔓 NÃO LOGADO
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/convite/:linkId" element={<ClientInvitePage />} />
        <Route path="/convite-equipe/:token" element={<TeamInvitePage />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  // ❌ BLOQUEADO
  if (profile?.status === "rejected") {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <BlockedAccessPage
              title="Acesso recusado"
              description="Seu cadastro não foi aprovado."
            />
          }
        />
      </Routes>
    );
  }

  // ⏳ PENDENTE
  if (profile && profile.status !== "approved" && role !== "admin") {
    return (
      <Routes>
        <Route path="*" element={<PendingApprovalPage />} />
      </Routes>
    );
  }

  // 🏪 DONO SEM SALÃO
  if (role === "dono" && salon === null) {
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
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/servicos" element={<ServicesPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/anamnese" element={<AnamnesesPage />} />
        <Route path="/pacotes" element={<PacotesPage />} />
        <Route path="/estoque" element={<EstoquePage />} />
        <Route path="/financeiro" element={<FinanceiroPage />} />
        <Route path="/contas" element={<ContasPage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
        <Route path="/notificacoes" element={<NotificationsPage />} />
        <Route path="/admin" element={<AdminPage />} />

        <Route
          path="/minha-agenda"
          element={
            role === "cliente" ? (
              <ClientSchedulePage />
            ) : (
              <MySchedulePage />
            )
          }
        />

        <Route
          path="/servicos-catalogo"
          element={<ServicesShowcasePage />}
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
