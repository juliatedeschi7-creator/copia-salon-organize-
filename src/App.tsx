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
import ClientAreaPage from "@/pages/ClientAreaPage";
import ContasPage from "@/pages/ContasPage";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Protected routes wrapper component
const ProtectedRoutes = () => {
  const { isAuthenticated, isLoading, profileLoaded, profile, isApproved, role } = useAuth();
  const { salon, isLoading: salonLoading } = useSalon();

  // Show loading while authenticating
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando autenticação...</p>
        </div>
      </div>
    );
  }

  // Not authenticated, show auth page
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Profile loaded but waiting for salon
  if (profileLoaded && salonLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando salão...</p>
        </div>
      </div>
    );
  }

  // Check pending approval
  if (profileLoaded && profile && profile.status === "pending") {
    console.log("⏳ User pending approval");
    return <PendingApprovalPage />;
  }

  // Check blocked access
  if (profileLoaded && profile && profile.access_state === "blocked") {
    console.log("🚫 User access blocked");
    return <BlockedAccessPage />;
  }

  // ✅ KEY CHECK: User authenticated but has no salon
  if (profileLoaded && !salon && isAuthenticated && role !== "admin") {
    console.warn("🏢 User authenticated but has no salon - showing CreateSalonPage");
    return <CreateSalonPage />;
  }

  // User is fully loaded and has salon - show app
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