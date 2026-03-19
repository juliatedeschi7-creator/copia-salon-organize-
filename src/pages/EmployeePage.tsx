import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSalon } from "@/contexts/SalonContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Package, Clock, CheckCircle, Loader2 } from "lucide-react";

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  status: string;
  notes: string | null;
  services: { name: string } | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "secondary" },
  aprovado: { label: "Aprovado", variant: "default" },
  concluido: { label: "Concluído", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
  recusado: { label: "Recusado", variant: "destructive" },
};

const FINAL_STATUSES = ["concluido", "cancelado", "recusado"];

const AppointmentCard = ({ a }: { a: Appointment }) => {
  const config = statusConfig[a.status] ?? { label: a.status, variant: "secondary" as const };
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <Clock className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{a.services?.name ?? "Serviço"}</p>
          <Badge variant={config.variant} className="shrink-0 text-xs">
            {config.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(a.appointment_date + "T00:00:00").toLocaleDateString("pt-BR")} · {a.start_time.slice(0, 5)}
        </p>
        {a.notes && <p className="mt-0.5 text-xs text-muted-foreground">{a.notes}</p>}
      </div>
    </div>
  );
};

const ClientAppointmentsView = () => {
  const { user, profile } = useAuth();
  const { salon } = useSalon();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetchAppointments = async () => {
      const baseQuery = supabase
        .from("appointments")
        .select("id, appointment_date, start_time, status, notes, services(name)")
        .eq("client_user_id", user.id)
        .order("appointment_date", { ascending: false })
        .order("start_time", { ascending: false });

      const { data, error } = await (salon ? baseQuery.eq("salon_id", salon.id) : baseQuery);
      if (!error) setAppointments((data ?? []) as unknown as Appointment[]);
      setLoading(false);
    };
    fetchAppointments();
  }, [user, salon]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const future = [...appointments]
    .filter((a) => a.appointment_date >= today && !FINAL_STATUSES.includes(a.status))
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time));
  const past = [...appointments]
    .filter((a) => a.appointment_date < today || FINAL_STATUSES.includes(a.status))
    .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date) || b.start_time.localeCompare(a.start_time));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meus Agendamentos</h1>
        <p className="text-sm text-muted-foreground">
          Olá, {profile?.full_name?.split(" ")[0] ?? "cliente"}!
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Futuros ({future.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {future.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum agendamento futuro.</p>
          ) : (
            <div className="space-y-3">
              {future.map((a) => <AppointmentCard key={a.id} a={a} />)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
            Passados ({past.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {past.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum agendamento anterior.</p>
          ) : (
            <div className="space-y-3">
              {past.map((a) => <AppointmentCard key={a.id} a={a} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const EmployeeScheduleView = () => {
  const { profile } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Minha Agenda</h1>
        <p className="text-sm text-muted-foreground">
          Seus agendamentos e comissões, {(profile as any)?.name?.split(" ")[0] ?? profile?.full_name?.split(" ")[0]}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">5</p>
              <p className="text-xs text-muted-foreground">Atendimentos hoje</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <Package className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">R$ 380</p>
              <p className="text-xs text-muted-foreground">Comissão do mês</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Meus agendamentos de hoje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { time: "09:00", client: "Ana Souza", service: "Corte" },
              { time: "10:30", client: "Carla Lima", service: "Escova" },
              { time: "14:00", client: "Julia Santos", service: "Coloração" },
            ].map((a) => (
              <div key={a.time} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold">{a.time}</span>
                <div>
                  <p className="text-sm font-medium">{a.client}</p>
                  <p className="text-xs text-muted-foreground">{a.service}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const EmployeePage = () => {
  const { role } = useAuth();
  if (role === "cliente") return <ClientAppointmentsView />;
  return <EmployeeScheduleView />;
};

export default EmployeePage;
