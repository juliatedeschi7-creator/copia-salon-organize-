import React, { useEffect, useMemo, useState } from "react";
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

function BootStuckScreen({
  onSignOut,
  diagnostic,
}: {
  onSignOut: () => void;
  diagnostic?: string | null;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
      <h1 className="text-lg font-semibold">Travado ao iniciar</h1>
      <p className="text-sm text-muted-foreground">
        O Safari pode estar bloqueando a sessão ou a conexão ficou pendurada. Tente sair e entrar novamente.
      </p>

      {diagnostic ? (
        <pre className="mt-2 w-full max-w-md overflow-auto rounded border bg-card p-3 text-left text-xs">
          {diagnostic}
        </pre>
      ) : null}

      <button
        className="mt-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        onClick={onSignOut}
      >
        Sair e entrar de novo
      </button>

      <p className="mt-2 text-xs text-muted-foreground">
        Dica: no iPhone, evite “Guia Privada”. Se persistir, limpe os dados do site nas configurações do Safari.
      </p>
    </div>
  );
}

const AppRoutes = () => {
  const {
    isAuthenticated,
    isApproved,
    isLoading,
    role,
    profile,
    profileLoaded,
    profileError,
    profileDiagnostic,
    signOut,
  } = useAuth();

  const { salon, isLoading: salonLoading } = useSalon();

  const waitingForBoot = useMemo(() => {
    if (!isAuthenticated) return isLoading; // show spinner while checking session
    // authenticated: wait for profile + salon (if needed)
    return isLoading || salonLoading || !profileLoaded;
  }, [isAuthenticated, isLoading, salonLoading, profileLoaded]);

  const [bootSeconds, setBootSeconds] = useState(0);

  useEffect(() => {
    if (!waitingForBoot) {
      setBootSeconds(0);
      return;
    }

    setBootSeconds(0);
    const id = window.setInterval(() => setBootSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [waitingForBoot]);

  // If boot takes too long, stop spinner and show a stuck screen (no infinite loading).
  if (waitingForBoot && bootSeconds >= 12) {
    return <BootStuckScreen onSignOut={() => signOut()} diagnostic={profileDiagnostic} />;
  }

  if (waitingForBoot && !profileError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/convite/:linkId" element={<ClientInvitePage />} />
        <Route path="/convite-equipe/:token" element={<TeamInvitePage />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  if (profileError) {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <BlockedAccessPage
              title="Erro ao carregar perfil"
              description="Não foi possível carregar os dados do seu perfil. Isso pode ser um problema de sessão ou conexão."
              message="Saia da conta e entre novamente. Se o problema persistir, tente limpar os dados do navegador para este site."
              diagnostic={profileDiagnostic}
            />
          }
        />
      </Routes>
    );
  }

  if (!isApproved && role !== "admin") {
    return (
      <Routes>
        <Route path="/convite/:linkId" element={<ClientInvitePage />} />
        <Route path="/convite-equipe/:token" element={<TeamInvitePage />} />
        <Route path="*" element={<PendingApprovalPage />} />
      </Routes>
    );
  }

  if (profile?.deleted_at && role !== "admin") {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <BlockedAccessPage
              title="Conta desativada"
              description="Sua conta foi desativada pelo administrador."
              message={profile.access_message || undefined}
            />
          }
        />
      </Routes>
    );
  }

  if (role !== "admin") {
    const isBlocked = profile?.access_state === "blocked";
    const isNoticeExpired =
      profile?.access_state === "notice" &&
      profile?.notice_until !== null &&
      profile?.notice_until !== undefined &&
      new Date(profile.notice_until) < new Date();

    if (isBlocked || isNoticeExpired) {
      return (
        <Routes>
          <Route
            path="*"
            element={
              <BlockedAccessPage
                title="Acesso bloqueado"
                description="Seu acesso ao sistema foi bloqueado pelo administrador."
                message={profile?.access_message || undefined}
              />
            }
          />
        </Routes>
      );
    }
  }

  if (role === "dono" && !salon) {
    return (
      <Routes>
        <Route path="/convite/:linkId" element={<ClientInvitePage />} />
        <Route path="/convite-equipe/:token" element={<TeamInvitePage />} />
        <Route path="*" element={<CreateSalonPage />} />
      </Routes>
    );
  }

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
        <Route path="/minha-agenda" element={role === "cliente" ? <ClientSchedulePage /> : <MySchedulePage />} />
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