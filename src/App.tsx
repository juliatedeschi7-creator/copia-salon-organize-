import React, { useEffect, useRef, useState } from "react";
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

  // If Safari gets stuck (session exists but profile/salon never resolves),
  // force logout to unblock UX (Option A).
  const [bootStuck, setBootStuck] = useState(false);
  const bootTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset timer whenever the "boot conditions" change
    if (bootTimerRef.current) window.clearTimeout(bootTimerRef.current);

    setBootStuck(false);

    // Only arm timer if user is authenticated and we are waiting for profile/salon
    const waiting = isAuthenticated && !profileError && (isLoading || salonLoading || !profileLoaded);

    if (!waiting) return;

    bootTimerRef.current = window.setTimeout(() => {
      setBootStuck(true);
    }, 12_000);

    return () => {
      if (bootTimerRef.current) window.clearTimeout(bootTimerRef.current);
    };
  }, [isAuthenticated, profileError, isLoading, salonLoading, profileLoaded]);

  useEffect(() => {
    // If it is stuck, force signOut (Option A)
    if (!bootStuck) return;
    // Avoid loops when already logged out
    if (!isAuthenticated) return;

    // Sign out to reset broken Safari session
    signOut();
  }, [bootStuck, isAuthenticated, signOut]);

  // Global loading spinner (but never infinite: the timer above will force signOut)
  if (!profileError && (isLoading || (isAuthenticated && (salonLoading || !profileLoaded)))) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {bootStuck && (
          <p className="text-xs text-muted-foreground">
            Travado ao iniciar. Reiniciando sessão...
          </p>
        )}
      </div>
    );
  }

  // Not logged in
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/convite/:linkId" element={<ClientInvitePage />} />
        <Route path="/convite-equipe/:token" element={<TeamInvitePage />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  // Profile/session error
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

  // Approval gating (non-admin)
  if (!isApproved && role !== "admin") {
    return (
      <Routes>
        <Route path="/convite/:linkId" element={<ClientInvitePage />} />
        <Route path="/convite-equipe/:token" element={<TeamInvitePage />} />
        <Route path="*" element={<PendingApprovalPage />} />
      </Routes>
    );
  }

  // Soft deleted (non-admin)
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

  // Access blocked/notice expired (non-admin)
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

  // Owner without salon
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