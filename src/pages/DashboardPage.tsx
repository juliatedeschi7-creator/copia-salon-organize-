import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, Users, TrendingUp } from "lucide-react";

const DashboardPage = () => {
  const { profile } = useAuth();

  const [stats, setStats] = useState({
    atendimentosHoje: 0,
    faturamentoHoje: 0,
    clientes: 0,
    ocupacao: 0,
  });

  const [agenda, setAgenda] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const today = new Date().toISOString().split("T")[0];

    // 🔹 atendimentos hoje
    const { data: appointments } = await supabase
      .from("appointments")
      .select("*")
      .eq("date", today);

    // 🔹 clientes
    const { count: clientsCount } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true });

    // 🔹 faturamento (exemplo simples)
    const total = appointments?.reduce((sum, a) => sum + (a.price || 0), 0) || 0;

    setStats({
      atendimentosHoje: appointments?.length || 0,
      faturamentoHoje: total,
      clientes: clientsCount || 0,
      ocupacao: appointments?.length ? Math.min(100, appointments.length * 10) : 0,
    });

    setAgenda(appointments || []);
  };

  const now = new Date();
  const dayName = now.toLocaleDateString("pt-BR", { weekday: "long" });
  const dateStr = now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Olá, {profile?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm capitalize text-muted-foreground">
          {dayName}, {dateStr}
        </p>
      </div>

      {/* 🔥 STATS REAIS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold">{stats.atendimentosHoje}</p>
            <p className="text-xs text-muted-foreground">Atendimentos hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold">
              R$ {stats.faturamentoHoje.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">Faturamento do dia</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold">{stats.clientes}</p>
            <p className="text-xs text-muted-foreground">Clientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold">{stats.ocupacao}%</p>
            <p className="text-xs text-muted-foreground">Ocupação</p>
          </CardContent>
        </Card>
      </div>

      {/* 🔥 AGENDA REAL */}
      <Card>
        <CardHeader>
          <CardTitle>Agenda de hoje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {agenda.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum agendamento hoje
              </p>
            )}

            {agenda.map((a) => (
              <div
                key={a.id}
                className="flex justify-between border p-3 rounded-lg"
              >
                <div>
                  <p className="font-bold">{a.time}</p>
                  <p>{a.client_name}</p>
                  <p className="text-xs text-muted-foreground">{a.service}</p>
                </div>

                <span className="text-xs">
                  {a.status || "agendado"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
