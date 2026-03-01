import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Scissors, Loader2, Clock, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/contexts/SalonContext";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
}

interface AvailableSlot {
  id: string;
  service_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const ServicesPage = () => {
  const { salon } = useSalon();
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [slotsDialogOpen, setSlotsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedServiceForSlots, setSelectedServiceForSlots] = useState<Service | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState(0);

  // Slot form
  const [slotDay, setSlotDay] = useState(1);
  const [slotStart, setSlotStart] = useState("09:00");
  const [slotEnd, setSlotEnd] = useState("10:00");

  const fetchData = async () => {
    if (!salon) return;
    const [sRes, slRes] = await Promise.all([
      supabase.from("services").select("*").eq("salon_id", salon.id).order("name"),
      supabase.from("available_slots").select("*").eq("salon_id", salon.id),
    ]);
    setServices((sRes.data || []) as Service[]);
    setSlots((slRes.data || []) as AvailableSlot[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [salon]);

  const openNew = () => {
    setEditingService(null);
    setName(""); setDescription(""); setDuration(60); setPrice(0);
    setDialogOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditingService(s);
    setName(s.name); setDescription(s.description); setDuration(s.duration_minutes); setPrice(s.price);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!salon || !name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (editingService) {
      const { error } = await supabase.from("services").update({ name, description, duration_minutes: duration, price }).eq("id", editingService.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Serviço atualizado!");
    } else {
      const { error } = await supabase.from("services").insert({ salon_id: salon.id, name, description, duration_minutes: duration, price });
      if (error) { toast.error(error.message); return; }
      toast.success("Serviço criado!");
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleToggleActive = async (s: Service) => {
    await supabase.from("services").update({ is_active: !s.is_active }).eq("id", s.id);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Serviço removido!");
    fetchData();
  };

  const openSlots = (s: Service) => {
    setSelectedServiceForSlots(s);
    setSlotsDialogOpen(true);
  };

  const handleAddSlot = async () => {
    if (!salon || !selectedServiceForSlots) return;
    const { error } = await supabase.from("available_slots").insert({
      salon_id: salon.id,
      service_id: selectedServiceForSlots.id,
      day_of_week: slotDay,
      start_time: slotStart,
      end_time: slotEnd,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Horário adicionado!");
    fetchData();
  };

  const handleDeleteSlot = async (id: string) => {
    await supabase.from("available_slots").delete().eq("id", id);
    toast.success("Horário removido!");
    fetchData();
  };

  const serviceSlots = slots.filter((sl) => sl.service_id === selectedServiceForSlots?.id);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Serviços & Horários</h1>
          <p className="text-sm text-muted-foreground">Cadastre serviços e defina horários disponíveis para agendamento</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo Serviço</Button>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Scissors className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado. Crie o primeiro!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const sSlots = slots.filter((sl) => sl.service_id === s.id && sl.is_active);
            return (
              <Card key={s.id} className={!s.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{s.name}</CardTitle>
                    <Switch checked={s.is_active} onCheckedChange={() => handleToggleActive(s)} />
                  </div>
                  {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {s.duration_minutes}min</span>
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> R$ {Number(s.price).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{sSlots.length} horário(s) disponível(is)</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openSlots(s)} className="flex-1">Horários</Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(s)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Service dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingService ? "Editar Serviço" : "Novo Serviço"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Corte feminino" /></div>
            <div className="space-y-2"><Label>Descrição</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Duração (min)</Label><Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>Preço (R$)</Label><Input type="number" step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>
            </div>
            <Button onClick={handleSave} className="w-full">{editingService ? "Salvar" : "Criar Serviço"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Slots dialog */}
      <Dialog open={slotsDialogOpen} onOpenChange={setSlotsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Horários — {selectedServiceForSlots?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-2 items-end">
              <div className="space-y-1 flex-1">
                <Label>Dia</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={slotDay} onChange={(e) => setSlotDay(Number(e.target.value))}>
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Início</Label>
                <Input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} className="w-28" />
              </div>
              <div className="space-y-1">
                <Label>Fim</Label>
                <Input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} className="w-28" />
              </div>
              <Button size="sm" onClick={handleAddSlot}><Plus className="h-4 w-4" /></Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {serviceSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum horário definido</p>
              ) : (
                serviceSlots.map((sl) => (
                  <div key={sl.id} className="flex items-center justify-between rounded-lg border border-border p-2">
                    <span className="text-sm">{DAYS[sl.day_of_week]} — {sl.start_time.slice(0, 5)} às {sl.end_time.slice(0, 5)}</span>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteSlot(sl.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicesPage;
