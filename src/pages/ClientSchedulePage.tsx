import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSalon } from "@/contexts/SalonContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface ClientAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  service_name?: string;
  employee_name?: string;
}

const statusColors: Record<string, string> = {
  agendado: "bg-blue-100 text-blue-800",
  confirmado: "bg-green-100 text-green-800",
  concluido: "bg-purple-100 text-purple-800",
  cancelado: "bg-red-100 text-red-800",
};

const ClientSchedulePage = () => {
  const { user, role } = useAuth();
  const { salon } = useSalon();
  const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");

  useEffect(() => {
    if (!user || !salon || role !== "cliente") {
      setLoading(false);
      return;
    }

    const fetchAppointments = async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("salon_id", salon.id)
        .eq("client_user_id", user.id)
        .order("appointment_date", { ascending: false });

      if (error) {
        toast.error("Erro ao carregar agenda: " + error.message);
        setLoading(false);
        return;
      }

      const serviceIds = [...new Set((data || []).map((a: any) => a.service_id))];
      const employeeIds = [...new Set((data || []).map((a: any) => a.employee_user_id))];

      const [servicesRes, employeesRes] = await Promise.all([
        serviceIds.length > 0
          ? supabase.from("services").select("id, name").in("id", serviceIds)
          : Promise.resolve({ data: [] }),
        employeeIds.length > 0
          ? supabase.from("profiles").select("user_id, full_name").in("user_id", employeeIds)
          : Promise.resolve({ data: [] }),
      ]);

      const serviceMap = Object.fromEntries(
        (servicesRes.data || []).map((s: any) => [s.id, s.name])
      );
      const employeeMap = Object.fromEntries(
        (employeesRes.data || []).map((p: any) => [p.user_id, p.full_name])
      );

      const mapped = (data || []).map((a: any) => ({
        ...a,
        service_name: serviceMap[a.service_id] || "Serviço",
        employee_name: employeeMap[a.employee_user_id] || "Profissional",
      }));

      setAppointments(mapped);
      setLoading(false);
    };

    fetchAppointments();
  }, [user, salon, role]);

  const upcoming = appointments.filter(
    (a) => !isPast(parseISO(`${a.appointment_date}T${a.start_time}`))
  );
  const past = appointments.filter((a) =>
    isPast(parseISO(`${a.appointment_date}T${a.start_time}`))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "cliente") {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Esta página é apenas para clientes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Minha Agenda</h1>
        <p className="text-sm text-muted-foreground">Seus agendamentos e histórico</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Próximos ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Histórico ({past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Nenhum agendamento próximo
              </CardContent>
            </Card>
          ) : (
            upcoming.map((apt) => (
              <Card key={apt.id}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{apt.service_name}</p>
                        <p className="text-sm text-muted-foreground">com {apt.employee_name}</p>
                      </div>
                      <Badge className={statusColors[apt.status]}>{apt.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(parseISO(apt.appointment_date), "dd 'de' MMMM", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {apt.start_time}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {past.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Nenhum agendamento passado
              </CardContent>
            </Card>
          ) : (
            past.map((apt) => (
              <Card key={apt.id} className="opacity-60">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{apt.service_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(`${apt.appointment_date}T${apt.start_time}`), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge className={statusColors[apt.status]} variant="outline">{apt.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientSchedulePage;
