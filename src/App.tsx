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

// Debug Loading Screen with detailed status
const DebugLoadingScreen = ({ status }: { status: string }) => {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <p className="text-lg font-semibold">Carregando autenticação...</p>
        <div className="bg-muted p-4 rounded-lg text-xs text-left space-y-1 font-mono">
          <p className="text-muted-foreground">{status}</p>
        </div>
      </div>
    </div>
  );
};

// Protected routes wrapper component with enhanced debugging
const ProtectedRoutes = () => {
  const { isAuthenticated, isLoading, profileLoaded, profile, isApproved, role } = useAuth();
  const { salon, isLoading: salonLoading } = useSalon();
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Update debug info whenever state changes
  useEffect(() => {
    const info = [
      `isLoading: ${isLoading}`,
      `profileLoaded: ${profileLoaded}`,
      `isAuthenticated: ${isAuthenticated}`,
      `salonLoading: ${salonLoading}`,
      `hasSalon: ${!!salon}`,
      `profile.status: ${profile?.status || "N/A"}`,
      `access_state: ${profile?.access_state || "N/A"}`,
      `role: ${role}`,
    ].join(" | ");
    
    setDebugInfo(info);
    console.log("Debug Info:", info);
  }, [isLoading, profileLoaded, isAuthenticated, salonLoading, salon, profile, role]);

  // Show loading while authenticating
  if (isLoading) {
    return <DebugLoadingScreen status="🔄 Obtendo sessão de autenticação..." />;
  }

  // Not authenticated, show auth page
  if (!isAuthenticated) {
    console.log("✅ User not authenticated - showing AuthPage");
    return <AuthPage />;
  }

  // Profile loaded but waiting for salon
  if (profileLoaded && salonLoading) {
    return <DebugLoadingScreen status="🏢 Carregando dados do salão..." />;
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

  // If still loading salon but all other conditions are met
  if (salonLoading && isAuthenticated) {
    return <DebugLoadingScreen status="⏳ Verificando salão..." />;
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