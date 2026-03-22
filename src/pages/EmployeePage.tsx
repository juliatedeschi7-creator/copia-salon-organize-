import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSalon } from "@/contexts/SalonContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  service_id: string;
  service_name?: string;
  client_name?: string;
  price?: number;
}

const EmployeePage = () => {
  const { profile, user, role } = useAuth();
  const { salon } = useSalon();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [commissionPercentage, setCommissionPercentage] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !salon || role !== "funcionario") {
        setLoading(false);
        return;
      }

      try {
        // Buscar percentual de comissão do funcionário
        const { data: memberData } = await supabase
          .from("salon_members")
          .select("commission_percentage")
          .eq("salon_id", salon.id)
          .eq("user_id", user.id)
          .single();

        if (memberData) {
          setCommissionPercentage(memberData.commission_percentage || 0);
        }

        // Buscar agendamentos DO FUNCIONÁRIO (employee_user_id = user.id)
        const { data: appts, error } = await supabase
          .from("appointments")
          .select("*")
          .eq("salon_id", salon.id)
          .eq("employee_user_id", user.id)
          .order("appointment_date", { ascending: true })
          .order("start_time", { ascending: true });

        if (error) throw error;

        // Buscar nomes dos serviços
        const serviceIds = [...new Set((appts || []).map((a: any) => a.service_id))];
        const clientIds = [...new Set((appts || []).map((a: any) => a.client_user_id))];

        const [servicesRes, profilesRes] = await Promise.all([
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
        const profileMap = Object.fromEntries(
          (profilesRes.data || []).map((p: any) => [p.user_id, p.full_name])
        );

        setAppointments(
          (appts || []).map((a: any) => ({
            ...a,
            service_name: serviceMap[a.service_id]?.name || "Serviço",
            price: serviceMap[a.service_id]?.price || 0,
            client_name: profileMap[a.client_user_id] || "Cliente",
          }))
        );
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        toast.error("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, salon, role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "funcionario") {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Acesso restrito a funcionários</p>
      </div>
    );
  }

  // Agendamentos de hoje
  const today = format(new Date(), "yyyy-MM-dd");
  const todayAppointments = appointments.filter((a) => a.appointment_date === today);

  // Comissão do mês (apenas agendamentos concluídos)
  const currentMonth = format(new Date(), "yyyy-MM");
  const monthAppointments = appointments.filter(
    (a) => a.appointment_date.startsWith(currentMonth) && a.status === "concluido"
  );
  const monthCommission = monthAppointments.reduce((total, a) => {
    const price = a.price || 0;
    return total + (price * commissionPercentage) / 100;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Minha Agenda</h1>
        <p className="text-sm text-muted-foreground">
          Seus agendamentos e comissões, {profile?.full_name?.split(" ")[0]}
        </p>
      </div>

      {/* Cards principais */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayAppointments.length}</p>
              <p className="text-xs text-muted-foreground">Atendimentos hoje</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">R$ {monthCommission.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">
                Comissão do mês ({commissionPercentage}%)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agendamentos de hoje */}
      {todayAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Meus agendamentos de hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayAppointments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-bold">
                        {a.start_time?.slice(0, 5)} - {a.service_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{a.client_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-primary">
                      R$ {((a.price || 0) * commissionPercentage / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Próximos agendamentos */}
      {appointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {appointments.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{a.service_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.appointment_date), "dd/MM/yyyy", { locale: ptBR })} às {a.start_time?.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{a.client_name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {appointments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum agendamento no momento</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeePage;
