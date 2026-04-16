import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Loader2, Plus, Trash2, Ban, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/contexts/SalonContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AppointmentCard from "@/components/agenda/AppointmentCard";
import AppointmentFormDialog from "@/components/agenda/AppointmentFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  client_user_id: string;
  service_id: string;
  salon_id: string;
  created_at: string;
  service_name?: string;
  client_name?: string;
  whatsapp_code?: string;
  whatsapp_confirmed_at?: string | null;
}

interface AvailableSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  service_id: string;
  service_name?: string;
}

interface Service {
  id: string;
  name: string;
}

interface BlockedDate {
  id: string;
  blocked_date: string;
  reason: string | null;
  created_at: string;
}

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const POSTGRES_UNIQUE_VIOLATION = "23505";

const AgendaPage = () => {
  const { salon } = useSalon();
  const { user } = useAuth();

  // ── Appointments ──────────────────────────────────────────────
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Slots ──────────────────────────────────────────────────────
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [newSlotDay, setNewSlotDay] = useState<string>("");
  const [newSlotService, setNewSlotService] = useState("");
  const [newSlotStart, setNewSlotStart] = useState("");
  const [newSlotEnd, setNewSlotEnd] = useState("");
  const [savingSlot, setSavingSlot] = useState(false);

  // ── Blocked dates ──────────────────────────────────────────────
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(true);
  const [newBlockDate, setNewBlockDate] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");
  const [savingBlock, setSavingBlock] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  // ── Fetch appointments ─────────────────────────────────────────
  const fetchAppointments = async () => {
    if (!salon) return;
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("salon_id", salon.id)
      .order("appointment_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) { console.error(error); setLoadingAppts(false); return; }

    const serviceIds = [...new Set((data || []).map((a: any) => a.service_id))];
    const clientIds = [...new Set((data || []).map((a: any) => a.client_user_id))];

    const [servicesRes, profilesRes] = await Promise.all([
      serviceIds.length > 0
        ? supabase.from("services").select("id, name").in("id", serviceIds)
        : Promise.resolve({ data: [] }),
      clientIds.length > 0
        ? supabase.from("profiles").select("user_id, name").in("user_id", clientIds)
        : Promise.resolve({ data: [] }),
    ]);

    const serviceMap = Object.fromEntries((servicesRes.data || []).map((s: any) => [s.id, s.name]));
    const profileMap = Object.fromEntries((profilesRes.data || []).map((p: any) => [p.user_id, p.name]));

    setAppointments(
      (data || []).map((a: any) => ({
        ...a,
        service_name: serviceMap[a.service_id] || "Serviço",
        client_name: profileMap[a.client_user_id] || "Cliente",
      }))
    );
    setLoadingAppts(false);
  };

  // ── Fetch slots ────────────────────────────────────────────────
  const fetchSlots = async () => {
    if (!salon) return;
    const [slotsRes, servicesRes] = await Promise.all([
      supabase.from("available_slots").select("*").eq("salon_id", salon.id).order("day_of_week").order("start_time"),
      supabase.from("services").select("id, name").eq("salon_id", salon.id).eq("is_active", true),
    ]);
    const serviceMap = Object.fromEntries((servicesRes.data || []).map((s: any) => [s.id, s.name]));
    setSlots((slotsRes.data || []).map((sl: any) => ({ ...sl, service_name: serviceMap[sl.service_id] || "Serviço" })));
    setServices((servicesRes.data || []) as Service[]);
    setLoadingSlots(false);
  };

  // ── Fetch blocked dates ────────────────────────────────────────
  const fetchBlockedDates = async () => {
    if (!salon) return;
    const { data, error } = await supabase
      .from("blocked_dates")
      .select("*")
      .eq("salon_id", salon.id)
      .order("blocked_date", { ascending: true });
    if (error) { console.error(error); }
    setBlockedDates((data || []) as BlockedDate[]);
    setLoadingBlocked(false);
  };

  useEffect(() => {
    fetchAppointments();
    fetchSlots();
    fetchBlockedDates();
  }, [salon]);

  // ── Realtime appointments ──────────────────────────────────────
  useEffect(() => {
    if (!salon) return;
    const channel = supabase
      .channel("appointments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `salon_id=eq.${salon.id}` }, () => {
        fetchAppointments();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [salon]);

  // ── Appointment actions ────────────────────────────────────────
  const handleUpdateStatus = async (a: Appointment, newStatus: string) => {
    if (!salon || !user) return;
    const { error } = await supabase.from("appointments").update({ status: newStatus }).eq("id", a.id);
    if (error) { toast.error("Erro ao atualizar: " + error.message); return; }

    const titleMap: Record<string, string> = {
      aprovado: "Agendamento confirmado! ✅",
      recusado: "Agendamento recusado",
      concluido: "Atendimento concluído! ✨",
    };
    const messageMap: Record<string, string> = {
      aprovado: `Seu agendamento de ${a.service_name} foi aprovado pelo salão.`,
      recusado: `Seu agendamento de ${a.service_name} foi recusado pelo salão.`,
      concluido: `Seu atendimento de ${a.service_name} foi concluído. Obrigado!`,
    };

    await supabase.from("notifications").insert({
      user_id: a.client_user_id,
      salon_id: salon.id,
      type: newStatus === "concluido" ? "agendamento_concluido" : newStatus === "aprovado" ? "agendamento_aprovado" : "agendamento_recusado",
      title: titleMap[newStatus] || "Atualização",
      message: messageMap[newStatus] || `Seu agendamento de ${a.service_name} foi atualizado.`,
      reference_id: a.id,
    });

    const toastMap: Record<string, string> = { aprovado: "Agendamento aprovado!", recusado: "Agendamento recusado.", concluido: "Atendimento concluído!" };
    toast.success(toastMap[newStatus] || "Status atualizado.");
    fetchAppointments();
  };

  const handleConfirmWhatsApp = async (a: Appointment) => {
    if (!user) return;
    const { error } = await supabase
      .from("appointments")
      .update({ whatsapp_confirmed_at: new Date().toISOString(), whatsapp_confirmed_by: user.id })
      .eq("id", a.id);
    if (error) { toast.error("Erro ao confirmar WhatsApp: " + error.message); return; }
    toast.success("WhatsApp confirmado! Agora você pode aprovar o agendamento.");
    fetchAppointments();
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from("appointments").delete().eq("id", deletingId);
    if (error) { toast.error("Erro ao excluir: " + error.message); }
    else { toast.success("Agendamento excluído."); }
    setDeletingId(null);
    fetchAppointments();
  };

  // ── Slot actions ───────────────────────────────────────────────
  const handleToggleSlot = async (slot: AvailableSlot) => {
    const { error } = await supabase.from("available_slots").update({ is_active: !slot.is_active }).eq("id", slot.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(slot.is_active ? "Horário desativado." : "Horário ativado.");
    fetchSlots();
  };

  const handleDeleteSlot = async (id: string) => {
    const { error } = await supabase.from("available_slots").delete().eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Horário removido.");
    fetchSlots();
  };

  const handleAddSlot = async () => {
    if (!salon || !newSlotDay || !newSlotService || !newSlotStart || !newSlotEnd) {
      toast.error("Preencha todos os campos do horário."); return;
    }
    if (newSlotStart >= newSlotEnd) {
      toast.error("O horário de início deve ser anterior ao horário de fim."); return;
    }
    setSavingSlot(true);
    const { error } = await supabase.from("available_slots").insert({
      salon_id: salon.id,
      day_of_week: parseInt(newSlotDay),
      service_id: newSlotService,
      start_time: newSlotStart,
      end_time: newSlotEnd,
      is_active: true,
    });
    setSavingSlot(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Horário adicionado!");
    setNewSlotDay(""); setNewSlotService(""); setNewSlotStart(""); setNewSlotEnd("");
    fetchSlots();
  };

  // ── Blocked date actions ───────────────────────────────────────
  const handleBlockDate = async () => {
    if (!salon || !newBlockDate) { toast.error("Selecione uma data para bloquear."); return; }
    setSavingBlock(true);
    const { error } = await supabase.from("blocked_dates").insert({
      salon_id: salon.id,
      blocked_date: newBlockDate,
      reason: newBlockReason || null,
      created_by: user?.id ?? null,
    });
    setSavingBlock(false);
    if (error) {
      if (error.code === POSTGRES_UNIQUE_VIOLATION) toast.error("Esta data já está bloqueada.");
      else toast.error("Erro: " + error.message);
      return;
    }
    toast.success("Data bloqueada com sucesso!");
    setNewBlockDate(""); setNewBlockReason("");
    fetchBlockedDates();
  };

  const handleUnblockDate = async (id: string) => {
    const { error } = await supabase.from("blocked_dates").delete().eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Data desbloqueada.");
    setUnblockingId(null);
    fetchBlockedDates();
  };

  // ── Derived data ───────────────────────────────────────────────
  const today = format(new Date(), "yyyy-MM-dd");
  const todayAppointments = appointments.filter((a) => a.appointment_date === today);
  const pendingAppointments = appointments.filter((a) => a.status === "pendente");
  const futureAppointments = appointments.filter((a) => a.appointment_date >= today && a.status !== "pendente");

  const slotsByDay = DAYS.map((dayName, dayIndex) => ({
    dayName,
    dayIndex,
    slots: slots.filter((sl) => sl.day_of_week === dayIndex),
  }));

  const upcomingBlockedDates = blockedDates.filter((b) => b.blocked_date >= today);
  const pastBlockedDates = blockedDates.filter((b) => b.blocked_date < today);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground">Gerencie os agendamentos e horários do seu salão</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditingAppointment(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Novo agendamento
        </Button>
      </div>

      <Tabs defaultValue="agendamentos">
        <TabsList className="mb-4">
          <TabsTrigger value="agendamentos" className="gap-2">
            Agendamentos
            {pendingAppointments.length > 0 && (
              <Badge className="h-5 min-w-[20px] rounded-full px-1 text-xs bg-yellow-500 text-white">
                {pendingAppointments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="horarios">Horários da Semana</TabsTrigger>
          <TabsTrigger value="bloqueios">Datas Bloqueadas</TabsTrigger>
        </TabsList>

        {/* ── TAB: Agendamentos ── */}
        <TabsContent value="agendamentos" className="space-y-6">
          {pendingAppointments.length > 0 && (
            <Card className="border-yellow-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-yellow-700">
                  <Clock className="h-5 w-5" />
                  Aguardando aprovação ({pendingAppointments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingAppointments.map((a) => (
                  <AppointmentCard
                    key={a.id}
                    appointment={a}
                    showDate
                    onConfirmWhatsApp={handleConfirmWhatsApp}
                    onApprove={(ap) => handleUpdateStatus(ap, "aprovado")}
                    onReject={(ap) => handleUpdateStatus(ap, "recusado")}
                    onEdit={(ap) => { setEditingAppointment(ap); setFormOpen(true); }}
                    onDelete={(ap) => setDeletingId(ap.id)}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                Agendamentos de hoje — {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAppts ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : todayAppointments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhum agendamento para hoje</p>
              ) : (
                <div className="space-y-3">
                  {todayAppointments.map((a) => (
                    <AppointmentCard
                      key={a.id}
                      appointment={a}
                      onComplete={(ap) => handleUpdateStatus(ap, "concluido")}
                      onEdit={(ap) => { setEditingAppointment(ap); setFormOpen(true); }}
                      onDelete={(ap) => setDeletingId(ap.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {futureAppointments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Próximos agendamentos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {futureAppointments.slice(0, 10).map((a) => (
                  <AppointmentCard
                    key={a.id}
                    appointment={a}
                    showDate
                    onComplete={(ap) => handleUpdateStatus(ap, "concluido")}
                    onEdit={(ap) => { setEditingAppointment(ap); setFormOpen(true); }}
                    onDelete={(ap) => setDeletingId(ap.id)}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── TAB: Horários da Semana ── */}
        <TabsContent value="horarios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Adicionar horário fixo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1">
                  <Label>Dia da semana</Label>
                  <Select value={newSlotDay} onValueChange={setNewSlotDay}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d, i) => (
                        <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Serviço</Label>
                  <Select value={newSlotService} onValueChange={setNewSlotService}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Início</Label>
                  <Input type="time" value={newSlotStart} onChange={(e) => setNewSlotStart(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Fim</Label>
                  <Input type="time" value={newSlotEnd} onChange={(e) => setNewSlotEnd(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddSlot} disabled={savingSlot} className="w-full gap-2">
                    {savingSlot ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Adicionar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loadingSlots ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-4">
              {slotsByDay.map(({ dayName, dayIndex, slots: daySlots }) =>
                daySlots.length > 0 ? (
                  <Card key={dayIndex}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{dayName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {daySlots.map((sl) => (
                        <div key={sl.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {sl.start_time.slice(0, 5)} – {sl.end_time.slice(0, 5)}
                              </p>
                              <p className="text-xs text-muted-foreground">{sl.service_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={sl.is_active ? "border-green-500/30 bg-green-500/10 text-green-700" : "border-muted text-muted-foreground"}>
                              {sl.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                            <Button size="sm" variant="outline" onClick={() => handleToggleSlot(sl)} title={sl.is_active ? "Desativar" : "Ativar"}>
                              {sl.is_active ? <XCircle className="h-4 w-4 text-yellow-600" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteSlot(sl.id)} title="Remover">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null
              )}
              {slots.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum horário fixo cadastrado. Adicione acima.
                </p>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── TAB: Datas Bloqueadas ── */}
        <TabsContent value="bloqueios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bloquear uma data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Data a bloquear</Label>
                  <Input type="date" value={newBlockDate} onChange={(e) => setNewBlockDate(e.target.value)} min={today} />
                </div>
                <div className="space-y-1">
                  <Label>Motivo (opcional)</Label>
                  <Input
                    placeholder="Ex: Casamento, Feriado..."
                    value={newBlockReason}
                    onChange={(e) => setNewBlockReason(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleBlockDate} disabled={savingBlock || !newBlockDate} className="w-full gap-2">
                    {savingBlock ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                    Bloquear data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loadingBlocked ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <>
              {upcomingBlockedDates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Próximas datas bloqueadas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {upcomingBlockedDates.map((b) => (
                      <div key={b.id} className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                        <div className="flex items-center gap-3">
                          <Ban className="h-4 w-4 text-destructive" />
                          <div>
                            <p className="text-sm font-medium">
                              {format(new Date(b.blocked_date + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                            {b.reason && <p className="text-xs text-muted-foreground">{b.reason}</p>}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-destructive hover:bg-destructive/10"
                          onClick={() => setUnblockingId(b.id)}
                        >
                          <Trash2 className="h-4 w-4" /> Desbloquear
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {pastBlockedDates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-muted-foreground">Datas anteriores bloqueadas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {pastBlockedDates.map((b) => (
                      <div key={b.id} className="flex items-center justify-between rounded-lg border border-border p-3 opacity-60">
                        <div className="flex items-center gap-3">
                          <Ban className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {format(new Date(b.blocked_date + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                            {b.reason && <p className="text-xs text-muted-foreground">{b.reason}</p>}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-muted-foreground"
                          onClick={() => setUnblockingId(b.id)}
                        >
                          <Trash2 className="h-4 w-4" /> Remover
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {blockedDates.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma data bloqueada. Use o formulário acima para fechar um dia específico.
                </p>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <AppointmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchAppointments}
        appointment={editingAppointment}
      />

      {/* Delete appointment confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O agendamento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unblock date confirmation */}
      <AlertDialog open={!!unblockingId} onOpenChange={(open) => !open && setUnblockingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desbloquear data?</AlertDialogTitle>
            <AlertDialogDescription>
              A data voltará a estar disponível para agendamentos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => unblockingId && handleUnblockDate(unblockingId)}>
              Desbloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgendaPage;
