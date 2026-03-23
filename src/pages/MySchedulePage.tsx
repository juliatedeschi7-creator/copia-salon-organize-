import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSalon } from "@/contexts/SalonContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, User, DollarSign, CheckCircle, Loader2 } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: "agendado" | "confirmado" | "concluido" | "cancelado";
  client_user_id: string;
  client_name?: string;
  service_id: string;
  service_name?: string;
  price?: number;
  commission_percentage?: number;
  notes?: string;
}

const statusColors: Record<string, string> = {
  agendado: "bg-blue-100 text-blue-800",
  confirmado: "bg-green-100 text-green-800",
  concluido: "bg-purple-100 text-purple-800",
  cancelado: "bg-red-100 text-red-800",
};

const MySchedulePage = () => {
  const { user, role } = useAuth();
  const { salon } = useSalon();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");

  useEffect(() => {
    if (!user || !salon || role === "cliente") {
      setLoading(false);
      return;
    }

    const fetchAppointments = async () => {
      let query = supabase
        .from("appointments")
        .select("*")
        .eq("salon_id", salon.id);

      if (role === "funcionario") {
        query = query.eq("employee_user_id", user.id);
      }

      const { data, error } = await query.order("appointment_date", {
        ascending: true,
      });

      if (error) {
        toast.error("Erro ao carregar agenda: " + error.message);
        setLoading(false);
        return;
      }

      const serviceIds = [...new Set((data || []).map((a: any) => a.service_id))];
      const clientIds = [...new Set((data || []).map((a: any) => a.client_user_id))];

      const [servicesRes, clientsRes] = await Promise.all([
        serviceIds.length > 0
          ? supabase.from("services").select("id, name, price").in("id", serviceIds)
          : Promise.resolve({ data: [] }),
        clientIds.length > 0
          ? supabase.from("profiles").select("user_id, full_name").in("user_id", clientIds)
          : Promise.resolve({ data: [] }),
      ]);

      const serviceMap = Object.fromEntries(
        (servicesRes.data || []).map((s: any) => [s.id, { name: s.name, price: s.price }])
      );
      const clientMap = Object.fromEntries(
        (clientsRes.data || []).map((p: any) => [p.user_id, p.full_name])
      );

      const mapped = (data || []).map((a: any) => ({
        ...a,
        service_name: serviceMap[a.service_id]?.name || "Serviço",
        client_name: clientMap[a.client_user_id] || "Cliente",
        price: serviceMap[a.service_id]?.price || 0,
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

  if (role === "cliente") {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Acesso restrito a funcionários e donos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Minha Agenda</h1>
        <p className="text-sm text-muted-foreground">Seus agendamentos e comissões</p>
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
                  <div className="grid gap-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{apt.service_name}</p>
                        <p className="text-sm text-muted-foreground">{apt.client_name}</p>
                      </div>
                      <Badge className={statusColors[apt.status]}>
                        {apt.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(parseISO(apt.appointment_date), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {apt.start_time} - {apt.end_time}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        R$ {apt.price?.toFixed(2)}
                      </div>
                      {apt.commission_percentage && (
                        <div className="flex items-center gap-2 font-semibold text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Comissão: {apt.commission_percentage}%
                        </div>
                      )}
                    </div>

                    {apt.notes && (
                      <p className="text-sm text-muted-foreground">Notas: {apt.notes}</p>
                    )}
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
              <Card key={apt.id} className="opacity-75">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{apt.service_name}</p>
                      <p className="text-sm text-muted-foreground">{apt.client_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(`${apt.appointment_date}T${apt.start_time}`), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <Badge className={statusColors[apt.status]}>
                      {apt.status}
                    </Badge>
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

export default MySchedulePage;
