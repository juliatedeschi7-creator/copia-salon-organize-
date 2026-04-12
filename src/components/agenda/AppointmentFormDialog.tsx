import React, { useState, useEffect } from "react";
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
      const [servicesRes, salonClients] = await Promise.all([
        supabase
          .from("services")
          .select("id, name, duration_minutes")
          .eq("salon_id", salon.id)
          .eq("is_active", true),

        fetchSalonClients(salon.id),
      ]);

      if (cancelled) return;

      setServices(servicesRes.data || []);
      setClients(
        salonClients.map((c: any) => ({
          user_id: c.user_id,
          name: c.displayName,
        }))
      );

      setFetching(false);
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [open, salon]);

  /* ================= EDIT FILL ================= */

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

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon || !user) return;

    const service = services.find((s) => s.id === serviceId);

    if (!service || !clientUserId || !date || !startTime) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    /* ================= CALC END TIME ================= */

    const [h, m] = startTime.split(":").map(Number);
    const totalMinutes = h * 60 + m + service.duration_minutes;

    const endTime = `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(
      totalMinutes % 60
    ).padStart(2, "0")}`;

    setLoading(true);

    try {
      /* ================= CONFLITO DE HORÁRIO ================= */

      const exists = await supabase
        .from("appointments")
        .select("id")
        .eq("appointment_date", date)
        .eq("start_time", startTime)
        .in("status", ["pendente", "aprovado"]);

      if (exists.data?.length) {
        toast.error("Esse horário já está ocupado.");
        setLoading(false);
        return;
      }

      /* ================= UPDATE ================= */

      if (isEdit && appointment) {
        const { error } = await supabase
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

        if (error) throw error;

        toast.success("Agendamento atualizado!");
      }

      /* ================= CREATE (PENDENTE) ================= */

      else {
        const { error } = await supabase.from("appointments").insert({
          salon_id: salon.id,
          service_id: serviceId,
          client_user_id: clientUserId,
          appointment_date: date,
          start_time: startTime,
          end_time: endTime,
          notes: notes || "",

          /* 🔥 FLUXO CORRETO */
          status: "pendente",
          whatsapp_code: null,
          whatsapp_confirmed_at: null,
          whatsapp_confirmed_by: null,
        });

        if (error) throw error;

        toast.success("Solicitação enviada! Aguardando aprovação.");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar: " + (err?.message || ""));
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
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* CLIENTE */}
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={clientUserId} onValueChange={setClientUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
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
            <div className="space-y-2">
              <Label>Serviço *</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço" />
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

            {/* DATA + HORA */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              <div>
                <Label>Horário *</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
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
                {isEdit ? "Salvar" : "Enviar pedido"}
              </Button>
            </div>

          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentFormDialog;
