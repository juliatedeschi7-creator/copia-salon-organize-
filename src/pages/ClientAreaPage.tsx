import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSalon } from "@/contexts/SalonContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, FileText, Package, Clock, Plus, Loader2, Bell, X, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import ClientPackages from "@/components/client/ClientPackages";
import ClientAnamnesis from "@/components/client/ClientAnamnesis";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { generateWhatsAppCode, buildWhatsAppLink } from "@/lib/whatsapp";

interface Service { id: string; name: string; duration_minutes: number; price: number; }
interface AvailableSlot { id: string; service_id: string; day_of_week: number; start_time: string; end_time: string; }
interface AppointmentRow { id: string; appointment_date: string; start_time: string; end_time: string; status: string; service_id: string; whatsapp_code: string; }
interface NotificationRow { id: string; title: string; message: string; is_read: boolean; created_at: string; type: string; }

const statusMap: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  aprovado: { label: "Confirmado", className: "bg-primary/15 text-primary border-primary/30" },
  recusado: { label: "Recusado", className: "bg-destructive/15 text-destructive border-destructive/30" },
  cancelado: { label: "Cancelado", className: "bg-muted text-muted-foreground border-border" },
  concluido: { label: "Concluído", className: "bg-green-500/15 text-green-700 border-green-500/30" },
};

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const ClientAreaPage = () => {
  const { profile, user } = useAuth();
  const { salon } = useSalon();
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookOpen, setBookOpen] = useState(false);
  const [anamnesisOpen, setAnamnesisOpen] = useState(false);

  // Booking form
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // WhatsApp confirmation dialog (shown after booking)
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [lastBookingCode, setLastBookingCode] = useState("");
  const [lastBookingInfo, setLastBookingInfo] = useState<{ serviceName: string; date: string; time: string } | null>(null);

  const fetchData = async () => {
    if (!salon || !user) return;
    const [sRes, slRes, aRes, nRes] = await Promise.all([
      supabase.from("services").select("id, name, duration_minutes, price").eq("salon_id", salon.id).eq("is_active", true),
      supabase.from("available_slots").select("*").eq("salon_id", salon.id).eq("is_active", true),
      supabase.from("appointments").select("*").eq("client_user_id", user.id).order("appointment_date", { ascending: false }),
      supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setServices((sRes.data || []) as Service[]);
    setSlots((slRes.data || []) as AvailableSlot[]);
    setAppointments((aRes.data || []) as AppointmentRow[]);
    setNotifications((nRes.data || []) as NotificationRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [salon, user]);

  // Realtime notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("client-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        const n = payload.new as NotificationRow;
        toast.info(n.title, { description: n.message });
        setNotifications((prev) => [n, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Available time slots for selected service + date
  const availableTimesForDate = () => {
    if (!selectedService || !selectedDate) return [];
    const date = new Date(selectedDate + "T00:00:00");
    const dayOfWeek = date.getDay();
    return slots.filter((sl) => sl.service_id === selectedService && sl.day_of_week === dayOfWeek);
  };

  const handleBook = async () => {
    if (!salon || !user || !selectedService || !selectedDate || !selectedSlot) {
      toast.error("Preencha todos os campos"); return;
    }
    setSubmitting(true);
    const slot = slots.find((s) => s.id === selectedSlot);
    if (!slot) { setSubmitting(false); return; }

    const code = generateWhatsAppCode();

    const { error } = await supabase.from("appointments").insert({
      salon_id: salon.id,
      client_user_id: user.id,
      service_id: selectedService,
      appointment_date: selectedDate,
      start_time: slot.start_time,
      end_time: slot.end_time,
      status: "pendente",
      whatsapp_code: code,
    });

    if (error) { toast.error(error.message); setSubmitting(false); return; }

    // Notify salon owner
    const serviceName = services.find((s) => s.id === selectedService)?.name || "Serviço";
    await supabase.from("notifications").insert({
      user_id: salon.owner_id,
      salon_id: salon.id,
      type: "novo_agendamento",
      title: "Novo agendamento! 📅",
      message: `${profile?.name || "Cliente"} agendou ${serviceName} para ${format(new Date(selectedDate + "T00:00:00"), "dd/MM/yyyy")}.`,
    });

    setBookOpen(false);
    setSelectedService(""); setSelectedDate(""); setSelectedSlot("");
    setSubmitting(false);
    fetchData();

    // Show WhatsApp confirmation dialog
    setLastBookingCode(code);
    setLastBookingInfo({
      serviceName,
      date: format(new Date(selectedDate + "T00:00:00"), "dd/MM/yyyy"),
      time: slot.start_time.slice(0, 5),
    });
    setWhatsappDialogOpen(true);
  };

  const handleCancel = async (appointmentId: string, serviceId: string) => {
    if (!salon || !user) return;
    const { error } = await supabase.from("appointments").update({ status: "cancelado" }).eq("id", appointmentId);
    if (error) { toast.error(error.message); return; }
    const serviceName = services.find((s) => s.id === serviceId)?.name || "Serviço";
    await supabase.from("notifications").insert({
      user_id: salon.owner_id,
      salon_id: salon.id,
      type: "agendamento_cancelado",
      title: "Agendamento cancelado ❌",
      message: `${profile?.name || "Cliente"} cancelou o agendamento de ${serviceName}.`,
      reference_id: appointmentId,
    });
    toast.success("Agendamento cancelado.");
    fetchData();
  };

  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s.name]));
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Olá, {profile?.name?.split(" ")[0]} 💅</h1>
          <p className="text-sm text-muted-foreground">Bem-vinda ao {salon?.name}</p>
        </div>
        {unreadCount > 0 && (
          <Badge className="gap-1"><Bell className="h-3 w-3" /> {unreadCount} nova(s)</Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Dialog open={bookOpen} onOpenChange={setBookOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer transition hover:shadow-md">
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">Agendar</p>
                  <p className="text-xs text-muted-foreground">Marque um horário</p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Agendamento</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Serviço</Label>
                <Select value={selectedService} onValueChange={(v) => { setSelectedService(v); setSelectedSlot(""); }}>
                  <SelectTrigger><SelectValue placeholder="Escolha o serviço" /></SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {s.duration_minutes}min — R$ {Number(s.price).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(""); }} min={format(new Date(), "yyyy-MM-dd")} />
              </div>
              {selectedService && selectedDate && (
                <div className="space-y-2">
                  <Label>Horário disponível</Label>
                  {availableTimesForDate().length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum horário disponível neste dia para este serviço</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableTimesForDate().map((sl) => (
                        <Button
                          key={sl.id}
                          size="sm"
                          variant={selectedSlot === sl.id ? "default" : "outline"}
                          onClick={() => setSelectedSlot(sl.id)}
                        >
                          {sl.start_time.slice(0, 5)}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <Button onClick={handleBook} disabled={submitting || !selectedSlot} className="w-full">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Solicitar agendamento
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="cursor-pointer transition hover:shadow-md" onClick={() => setAnamnesisOpen(true)}>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold">Fichas</p>
              <p className="text-xs text-muted-foreground">Anamnese e histórico</p>
            </div>
          </CardContent>
        </Card>

      </div>

      <ClientAnamnesis open={anamnesisOpen} onOpenChange={setAnamnesisOpen} />

      {/* WhatsApp Confirmation Dialog */}
      <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" /> Confirmação pelo WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Seu pedido foi enviado! Para que o salão possa <strong>aprovar</strong> seu agendamento, você precisa enviar o código abaixo pelo WhatsApp.
            </p>
            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Seu código de confirmação</p>
              <p className="text-3xl font-bold tracking-widest text-primary">{lastBookingCode}</p>
            </div>
            {salon?.phone ? (
              <Button
                className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  const link = buildWhatsAppLink(
                    salon.phone!,
                    lastBookingCode,
                    lastBookingInfo?.serviceName || "",
                    lastBookingInfo?.date || "",
                    lastBookingInfo?.time || ""
                  );
                  window.open(link, "_blank");
                }}
              >
                <MessageCircle className="h-4 w-4" />
                Enviar código pelo WhatsApp
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Entre em contato com o salão e informe o código: <strong>{lastBookingCode}</strong>
              </p>
            )}
            <p className="text-xs text-center text-muted-foreground">
              O agendamento só será aprovado após o salão confirmar o recebimento do código.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setWhatsappDialogOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meus Pacotes */}
      <ClientPackages />

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Bell className="h-5 w-5 text-primary" /> Notificações</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {notifications.slice(0, 5).map((n) => (
              <div key={n.id} className={`rounded-lg border p-3 ${n.is_read ? "border-border" : "border-primary/30 bg-primary/5"}`}>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Appointments */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Seus agendamentos</CardTitle></CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum agendamento ainda</p>
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{serviceMap[a.service_id] || "Serviço"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.appointment_date + "T00:00:00"), "dd/MM/yyyy")} às {a.start_time?.slice(0, 5)}
                      </p>
                      {a.status === "pendente" && a.whatsapp_code && (
                        <p className="text-xs text-green-700 font-medium mt-0.5">
                          Código WhatsApp: <span className="tracking-wider">{a.whatsapp_code}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(a.status === "pendente" || a.status === "aprovado") && (
                      <Button size="sm" variant="outline" className="gap-1 text-destructive hover:bg-destructive/10" onClick={() => handleCancel(a.id, a.service_id)}>
                        <X className="h-3 w-3" /> Cancelar
                      </Button>
                    )}
                    <Badge variant="outline" className={statusMap[a.status]?.className}>
                      {statusMap[a.status]?.label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientAreaPage;
