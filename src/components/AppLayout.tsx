import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { cn } from "@/lib/utils";
import { Menu, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, differenceInHours, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const AccessNoticeBanner = () => {
  const { profile, role } = useAuth();

  if (role === "admin") return null;
  if (profile?.access_state !== "notice") return null;

  // If notice_until is set and already past, don't show banner (App.tsx handles blocking)
  if (profile.notice_until !== null && profile.notice_until !== undefined && new Date(profile.notice_until) < new Date()) return null;

  let timeLabel = "";
  if (profile.notice_until) {
    try {
      const until = parseISO(profile.notice_until);
      const daysLeft = differenceInDays(until, new Date());
      if (daysLeft >= 1) {
        timeLabel = ` Faltam ${daysLeft} dia${daysLeft !== 1 ? "s" : ""} (até ${format(until, "dd/MM/yyyy", { locale: ptBR })}).`;
      } else {
        const hoursLeft = differenceInHours(until, new Date());
        if (hoursLeft >= 1) {
          timeLabel = ` Faltam ${hoursLeft} hora${hoursLeft !== 1 ? "s" : ""}.`;
        } else {
          timeLabel = " Vence em breve.";
        }
      }
    } catch {
      // invalid date string, skip time label
    }
  }

  return (
    <div className="flex items-start gap-3 border-b border-yellow-300 bg-yellow-50 px-4 py-3 text-yellow-900 dark:border-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-200">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
      <p className="text-sm">
        {profile.access_message || "Atenção: seu acesso está em período de carência."}
        {timeLabel}
      </p>
    </div>
  );
};

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background overflow-x-hidden">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <main
        className={cn(
          "flex-1 min-w-0 transition-all duration-300",
          collapsed ? "md:ml-16" : "md:ml-64"
        )}
      >
        {/* Mobile top bar */}
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background px-4 py-3 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="h-8 w-8"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sm font-semibold truncate">Espaço Maria Magnólia</span>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <AccessNoticeBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
