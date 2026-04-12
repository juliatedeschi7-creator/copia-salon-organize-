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

/* ================= TYPES ================= */

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

interface RecurringClient {
  id: string;
  salon_id: string;
  client_user_id: string;
  service_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface BlockedPeriod {
  id: string;
  salon_id: string;
  blocked_date: string;
  start_time: string;
  end_time: string;
}

/* ================= CONSTANTS ================= */

const DAYS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

/* ================= COMPONENT ================= */

const AgendaPage = () => {
  const { salon } = useSalon();
  const { user } = useAuth();

/* ================= STATE ================= */

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [recurringClients, setRecurringClients] = useState<RecurringClient[]>([]);
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);

  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

/* ================= HELPERS ================= */

  const isBlocked = (date: string, start: string, end: string) => {
    return blockedPeriods.some(b =>
      b.blocked_date === date &&
      start < b.end_time &&
      end > b.start_time
    );
  };

/* ================= FETCH ================= */

  const fetchAppointments = async () => {
    if (!salon) return;

    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("salon_id", salon.id)
      .order("appointment_date", { ascending: true });

    const serviceIds = [...new Set((data || []).map(a => a.service_id))];
    const clientIds = [...new Set((data || []).map(a => a.client_user_id))];

    const [servicesRes, profilesRes] = await Promise.all([
      supabase.from("services").select("id,name").in("id", serviceIds),
      supabase.from("profiles").select("user_id,name").in("user_id", clientIds),
    ]);

    const serviceMap = Object.fromEntries((servicesRes.data || []).map(s => [s.id, s.name]));
    const clientMap = Object.fromEntries((profilesRes.data || []).map(p => [p.user_id, p.name]));

    setAppointments(
      (data || []).map(a => ({
        ...a,
        service_name: serviceMap[a.service_id] || "Serviço",
        client_name: clientMap[a.client_user_id] || "Cliente",
      }))
    );

    setLoading(false);
  };

  const fetchRecurring = async () => {
    const { data } = await supabase
      .from("recurring_clients")
      .select("*")
      .eq("salon_id", salon.id)
      .eq("is_active", true);

    setRecurringClients(data || []);
  };

  const fetchBlocked = async () => {
    const { data } = await supabase
      .from("blocked_periods")
      .select("*")
      .eq("salon_id", salon.id);

    setBlockedPeriods(data || []);
  };

/* ================= RECURRING ================= */

  const generateRecurring = async () => {
    for (const rc of recurringClients) {
      const next = new Date();
      while (next.getDay() !== rc.day_of_week) {
        next.setDate(next.getDate() + 1);
      }

      const dateStr = next.toISOString().split("T")[0];

      const exists = await supabase
        .from("appointments")
        .select("id")
        .eq("client_user_id", rc.client_user_id)
        .eq("appointment_date", dateStr);

      if (exists.data?.length) continue;

      if (isBlocked(dateStr, rc.start_time, rc.end_time)) continue;

      await supabase.from("appointments").insert({
        salon_id: salon.id,
        client_user_id: rc.client_user_id,
        service_id: rc.service_id,
        appointment_date: dateStr,
        start_time: rc.start_time,
        end_time: rc.end_time,
        status: "pendente",
        notes: "Automático (cliente fixo)",
      });
    }
  };

/* ================= ACTIONS ================= */

  const handleCreate = async (payload: any) => {
    if (isBlocked(payload.appointment_date, payload.start_time, payload.end_time)) {
      toast.error("Horário bloqueado");
      return;
    }

    await supabase.from("appointments").insert(payload);
    fetchAppointments();
  };

  const handleNoShow = async (a: Appointment) => {
    await supabase.from("appointments").update({ status: "faltou" }).eq("id", a.id);
    toast.success("Marcado como falta");
    fetchAppointments();
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await supabase.from("appointments").delete().eq("id", deletingId);
    setDeletingId(null);
    fetchAppointments();
  };

/* ================= EFFECTS ================= */

  useEffect(() => {
    if (!salon) return;

    fetchAppointments();
    fetchRecurring();
    fetchBlocked();
  }, [salon]);

  useEffect(() => {
    if (recurringClients.length) generateRecurring();
  }, [recurringClients]);

/* ================= UI ================= */

  return (
    <div className="space-y-6">

      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Agenda</h1>

        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo
        </Button>
      </div>

      {loading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <div className="space-y-3">
          {appointments.map(a => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              onEdit={() => { setEditingAppointment(a); setFormOpen(true); }}
              onDelete={() => setDeletingId(a.id)}
              onNoShow={() => handleNoShow(a)}
            />
          ))}
        </div>
      )}

      <AppointmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        appointment={editingAppointment}
        onSuccess={fetchAppointments}
      />

      {/* DELETE */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Excluir?</AlertDialogTitle>
          <AlertDialogAction onClick={handleDelete}>
            Sim
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default AgendaPage;
