import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/contexts/SalonContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { fetchSalonClients } from "@/lib/salonClients";

/* ================= TYPES ================= */

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  appointment?: any | null;
}

/* ================= COMPONENT ================= */

const AppointmentFormDialog = ({
  open,
  onOpenChange,
  onSuccess,
  appointment,
}: AppointmentFormDialogProps) => {
  const { salon } = useSalon();
  const { user } = useAuth();

  const [services, setServices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [serviceId, setServiceId] = useState("");
  const [clientUserId, setClientUserId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");

  const isEdit = !!appointment;

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    if (!open || !salon) return;

    let cancelled = false;
    setFetching(true);

    const fetchData = async () => {
      const [servicesRes, salonClients, slotsRes, appointmentsRes] =
        await Promise.all([
          supabase
            .from("services")
            .select("id, name, duration_minutes")
            .eq("salon_id", salon.id)
            .eq("is_active", true),

          fetchSalonClients(salon.id),

          supabase
            .from("available_slots")
            .select("*")
            .eq("salon_id", salon.id),

          supabase
            .from("appointments")
            .select("*")
            .eq("salon_id", salon.id),
        ]);

      if (cancelled) return;

      setServices(servicesRes.data || []);
      setClients(
        salonClients.map((c: any) => ({
          user_id: c.user_id,
          name: c.displayName,
        }))
      );

      setSlots(slotsRes.data || []);
      setAppointments(appointmentsRes.data || []);

      setFetching(false);
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [open, salon]);

  /* ================= EDIT ================= */

  useEffect(() => {
    if (appointment) {
      setServiceId(appointment.service_id);
      setClientUserId(appointment.client_user_id);
      setDate(appointment.appointment_date);
      setStartTime(appointment.start_time?.slice(0, 5));
      setNotes(appointment.notes || "");
    } else {
      setServiceId("");
      setClientUserId("");
      setDate("");
      setStartTime("");
      setNotes("");
    }
  }, [appointment, open]);

  /* ================= AVAILABLE SLOTS ================= */

  const availableSlots = useMemo(() => {
    if (!date) return [];

    const day = new Date(date).getDay();

    return slots.filter((slot) => {
      const sameDay = slot.day_of_week === day;

      const alreadyBooked = appointments.some(
        (a) =>
          a.appointment_date === date &&
          a.start_time === slot.start_time &&
          a.status !== "recusado"
      );

      return sameDay && slot.is_active && !alreadyBooked;
    });
  }, [date, slots, appointments]);

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon || !user) return;

    const service = services.find((s) => s.id === serviceId);

    if (!service || !clientUserId || !date || !startTime) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    /* ================= END TIME ================= */

    const [h, m] = startTime.split(":").map(Number);
    const totalMinutes = h * 60 + m + service.duration_minutes;

    const endTime = `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(
      totalMinutes % 60
    ).padStart(2, "0")}`;

    setLoading(true);

    try {
      /* ================= CONFLITO ================= */

      const exists = await supabase
        .from("appointments")
        .select("id")
        .eq("appointment_date", date)
        .eq("start_time", startTime)
        .in("status", ["pendente", "aprovado"]);

      if (exists.data?.length) {
        toast.error("Esse horário já foi ocupado.");
        setLoading(false);
        return;
      }

      /* ================= EDIT ================= */

      if (isEdit && appointment) {
        await supabase
          .from("appointments")
          .update({
            service_id: serviceId,
            client_user_id: clientUserId,
            appointment_date: date,
            start_time: startTime,
            end_time: endTime,
            notes: notes || "",
          })
          .eq("id", appointment.id);

        toast.success("Atualizado!");
      }

      /* ================= CREATE (PENDENTE) ================= */

      else {
        await supabase.from("appointments").insert({
          salon_id: salon.id,
          service_id: serviceId,
          client_user_id: clientUserId,
          appointment_date: date,
          start_time: startTime,
          end_time: endTime,
          notes: notes || "",

          status: "pendente", // 🔥 FLUXO CORRETO
        });

        toast.success("Pedido enviado!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar agendamento" : "Novo agendamento"}
          </DialogTitle>
        </DialogHeader>

        {fetching ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* CLIENTE */}
            <div>
              <Label>Cliente</Label>
              <Select value={clientUserId} onValueChange={setClientUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.user_id} value={c.user_id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SERVIÇO */}
            <div>
              <Label>Serviço</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.duration_minutes}min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* DATA */}
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setStartTime("");
                }}
              />
            </div>

            {/* HORÁRIOS REAIS */}
            <div>
              <Label>Horários disponíveis</Label>

              {!date ? (
                <p className="text-sm text-muted-foreground">
                  Escolha uma data
                </p>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-red-500">
                  Nenhum horário disponível
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.id}
                      type="button"
                      variant={
                        startTime === slot.start_time ? "default" : "outline"
                      }
                      onClick={() => setStartTime(slot.start_time)}
                    >
                      {slot.start_time}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* OBS */}
            <div>
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>

              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Salvar" : "Agendar"}
              </Button>
            </div>

          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentFormDialog;
