import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SalonProvider, useSalon } from "@/contexts/SalonContext";
import AppLayout from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import PendingApprovalPage from "@/pages/PendingApprovalPage";
import BlockedAccessPage from "@/pages/BlockedAccessPage";
import CreateSalonPage from "@/pages/CreateSalonPage";
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
import EmployeePage from "@/pages/EmployeePage";
import ClientAreaPage from "@/pages/ClientAreaPage";
import ClientInvitePage from "@/pages/ClientInvitePage";
import TeamInvitePage from "@/pages/TeamInvitePage";
import ContasPage from "@/pages/ContasPage";
import MySchedulePage from "@/pages/MySchedulePage";
import ClientSchedulePage from "@/pages/ClientSchedulePage";
import ServicesShowcasePage from "@/pages/ServicesShowcasePage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const {
    isAuthenticated,
    isApproved,
    isLoading,
    role,
    profile,
    profileLoaded,
    profileError,
  } = useAuth();

  const { salon, isLoading: salonLoading } = useSalon();

  // ✅ FIX 1 — loading simplificado (remove loop)
  if (isLoading || (isAuthenticated && !profileLoaded)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

  // ❌ ERRO REAL de perfil (não loading falso)
  if (profileError && !profileLoaded) {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <BlockedAccessPage
              title="Erro ao carregar perfil"
              description="Não foi possível carregar os dados do seu perfil."
              message="Tente sair e entrar novamente."
            />
          }
        />
      </Routes>
    );
  }

  // ⏳ AGUARDANDO APROVAÇÃO (CORRIGIDO)
  if (profileLoaded && !isApproved && role !== "admin") {
    return (
      <Routes>
        <Route path="/convite/:linkId" element={<ClientInvitePage />} />
        <Route path="/convite-equipe/:token" element={<TeamInvitePage />} />
        <Route path="*" element={<PendingApprovalPage />} />
      </Routes>
    );
  }

  // 🚫 CONTA DESATIVADA
  if (profile?.deleted_at && role !== "admin") {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <BlockedAccessPage
              title="Conta desativada"
              description="Sua conta foi desativada pelo administrador."
            />
          }
        />
      </Routes>
    );
  }

  // 🚫 BLOQUEIO
  if (role !== "admin") {
    const isBlocked = profile?.access_state === "blocked";

    if (isBlocked) {
      return (
        <Routes>
          <Route
            path="*"
            element={
              <BlockedAccessPage
                title="Acesso bloqueado"
                description="Seu acesso foi bloqueado."
              />
            }
          />
        </Routes>
      );
    }
  }

  // 🏪 DONO SEM SALÃO
  if (role === "dono" && !salon) {
    return (
      <Routes>
        <Route path="/convite/:linkId" element={<ClientInvitePage />} />
        <Route path="/convite-equipe/:token" element={<TeamInvitePage />} />
        <Route path="*" element={<CreateSalonPage />} />
      </Routes>
    );
  }

  // ✅ APP NORMAL
  return (
    <Routes>
      <Route path="/convite/:linkId" element={<ClientInvitePage />} />
      <Route path="/convite-equipe/:token" element={<TeamInvitePage />} />

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
          element={role === "cliente" ? <ClientSchedulePage /> : <MySchedulePage />}
        />
        <Route path="/servicos-catalogo" element={<ServicesShowcasePage />} />
        <Route path="/cliente-area" element={<ClientAreaPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SalonProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </SalonProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
