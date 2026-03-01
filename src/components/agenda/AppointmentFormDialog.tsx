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
import { generateWhatsAppCode } from "@/lib/whatsapp";

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  appointment?: {
    id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    client_user_id: string;
    service_id: string;
    notes: string | null;
    status: string;
  } | null;
}

interface ServiceOption {
  id: string;
  name: string;
  duration_minutes: number;
}

interface ClientOption {
  user_id: string;
  name: string;
}

const AppointmentFormDialog = ({ open, onOpenChange, onSuccess, appointment }: AppointmentFormDialogProps) => {
  const { salon } = useSalon();
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [serviceId, setServiceId] = useState("");
  const [clientUserId, setClientUserId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");

  const isEdit = !!appointment;

  useEffect(() => {
    if (!open || !salon) return;
    setFetching(true);

    const fetchData = async () => {
      const [servicesRes, membersRes] = await Promise.all([
        supabase.from("services").select("id, name, duration_minutes").eq("salon_id", salon.id).eq("is_active", true),
        supabase.from("salon_members").select("user_id, role").eq("salon_id", salon.id).eq("role", "cliente"),
      ]);

      setServices((servicesRes.data || []) as ServiceOption[]);

      // Fetch profile names for client members
      const clientUserIds = (membersRes.data || []).map((m: any) => m.user_id);
      if (clientUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", clientUserIds);
        setClients((profiles || []) as ClientOption[]);
      } else {
        setClients([]);
      }

      setFetching(false);
    };

    fetchData();
  }, [open, salon]);

  useEffect(() => {
    if (appointment) {
      setServiceId(appointment.service_id);
      setClientUserId(appointment.client_user_id);
      setDate(appointment.appointment_date);
      setStartTime(appointment.start_time?.slice(0, 5) || "");
      setNotes(appointment.notes || "");
    } else {
      setServiceId("");
      setClientUserId("");
      setDate("");
      setStartTime("");
      setNotes("");
    }
  }, [appointment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon || !user) return;

    const service = services.find((s) => s.id === serviceId);
    if (!service || !clientUserId || !date || !startTime) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    // Calculate end time from duration
    const [h, m] = startTime.split(":").map(Number);
    const totalMinutes = h * 60 + m + service.duration_minutes;
    const endH = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const endM = String(totalMinutes % 60).padStart(2, "0");
    const endTime = `${endH}:${endM}`;

    setLoading(true);

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

      if (error) {
        toast.error("Erro ao atualizar: " + error.message);
      } else {
        toast.success("Agendamento atualizado!");
        onSuccess();
        onOpenChange(false);
      }
    } else {
      const now = new Date().toISOString();
      const { error } = await supabase.from("appointments").insert({
        salon_id: salon.id,
        service_id: serviceId,
        client_user_id: clientUserId,
        appointment_date: date,
        start_time: startTime,
        end_time: endTime,
        notes: notes || "",
        status: "aprovado",
        whatsapp_code: generateWhatsAppCode(),
        whatsapp_confirmed_at: now,
        whatsapp_confirmed_by: user.id,
      });

      if (error) {
        toast.error("Erro ao criar: " + error.message);
      } else {
        toast.success("Agendamento criado!");
        onSuccess();
        onOpenChange(false);
      }
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
        </DialogHeader>

        {fetching ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={clientUserId} onValueChange={setClientUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.user_id} value={c.user_id}>
                      {c.name || "Sem nome"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Horário *</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional..." rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentFormDialog;
