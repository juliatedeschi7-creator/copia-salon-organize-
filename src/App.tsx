import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "@/contexts/AuthContext";
import { SalonProvider } from "@/contexts/SalonContext";

import AuthPage from "@/pages/AuthPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SalonProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />

            <BrowserRouter>
              <Routes>
                <Route path="*" element={<AuthPage />} />
              </Routes>
            </BrowserRouter>

          </TooltipProvider>
        </SalonProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
