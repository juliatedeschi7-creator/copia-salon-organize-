import React, { useEffect, useState } from "react";
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
import ClientAreaPage from "@/pages/ClientAreaPage";
import ContasPage from "@/pages/ContasPage";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const LoadingScreen = ({ text }: { text: string }) => (
  <div className="flex h-screen flex-col items-center justify-center bg-background px-4">
    <Loader2 className="h-10 w-10 animate-spin mb-4" />
    <p>{text}</p>
  </div>
);

const ProtectedRoutes = () => {
  const { isAuthenticated, isLoading, profileLoaded, profile, role } = useAuth();
  const { salon, isLoading: salonLoading } = useSalon();

  // 🔥 1. AUTH loading
  if (isLoading) {
    return <LoadingScreen text="Carregando autenticação..." />;
  }

  // 🔥 2. NOT LOGGED
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // 🔥 3. ESPERA PROFILE CARREGAR
  if (!profileLoaded) {
    return <LoadingScreen text="Carregando perfil..." />;
  }

  // 🔥 4. ESPERA SALON TERMINAR DE CARREGAR (ESSENCIAL)
  if (salonLoading) {
    return <LoadingScreen text="Carregando salão..." />;
  }

  // 🔥 5. BLOQUEIOS
  if (profile?.status === "pending") {
    return <PendingApprovalPage />;
  }

  if (profile?.access_state === "blocked") {
    return <BlockedAccessPage />;
  }

  // 🔥 6. AGORA SIM decide se tem salão
  if (!salon && role !== "admin") {
    return <CreateSalonPage />;
  }

  // 🔥 7. APP NORMAL
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/servicos" element={<ServicesPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/anamneses" element={<AnamnesesPage />} />
        <Route path="/area-cliente" element={<ClientAreaPage />} />
        <Route path="/contas" element={<ContasPage />} />
      </Routes>
    </AppLayout>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SalonProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Sonner />
              <Toaster />
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/*" element={<ProtectedRoutes />} />
              </Routes>
            </TooltipProvider>
          </QueryClientProvider>
        </SalonProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}