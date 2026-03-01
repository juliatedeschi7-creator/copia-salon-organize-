import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, Users, TrendingUp } from "lucide-react";

const DashboardPage = () => {
  const { profile } = useAuth();

  const now = new Date();
  const dayName = now.toLocaleDateString("pt-BR", { weekday: "long" });
  const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const stats = [
    { label: "Atendimentos hoje", value: "8", icon: Calendar, color: "text-primary" },
    { label: "Faturamento do dia", value: "R$ 1.240", icon: DollarSign, color: "text-accent" },
    { label: "Clientes ativos", value: "142", icon: Users, color: "text-primary" },
    { label: "Taxa ocupação", value: "75%", icon: TrendingUp, color: "text-accent" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {profile?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm capitalize text-muted-foreground">
          {dayName}, {dateStr}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agenda de hoje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { time: "09:00", client: "Ana Souza", service: "Corte + Escova", status: "confirmado" },
              { time: "10:30", client: "Carla Lima", service: "Manicure", status: "agendado" },
              { time: "13:00", client: "Julia Santos", service: "Coloração", status: "confirmado" },
              { time: "15:00", client: "Mariana Costa", service: "Pedicure", status: "agendado" },
            ].map((a) => (
              <div
                key={a.time}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary">{a.time}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.client}</p>
                    <p className="text-xs text-muted-foreground">{a.service}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    a.status === "confirmado"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {a.status}
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
