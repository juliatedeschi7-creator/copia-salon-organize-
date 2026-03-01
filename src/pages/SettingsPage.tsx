import React, { useState, useRef, useEffect } from "react";
import { useSalon } from "@/contexts/SalonContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Save, Clock, Bell, Palette, Loader2, Plus, X, Send } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const REMINDER_OPTIONS = [
  { value: 1, label: "1 hora antes" },
  { value: 2, label: "2 horas antes" },
  { value: 6, label: "6 horas antes" },
  { value: 12, label: "12 horas antes" },
  { value: 24, label: "24 horas antes" },
  { value: 48, label: "48 horas antes" },
];

const SettingsPage = () => {
  const { salon, updateSalon, isLoading } = useSalon();
  const { user } = useAuth();
  const [form, setForm] = useState<any>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifForm, setNotifForm] = useState({ title: "", message: "", target: "all" });
  const [salonMembers, setSalonMembers] = useState<any[]>([]);

  useEffect(() => {
    if (salon) {
      setForm({ ...salon, reminder_hours: salon.reminder_hours ?? [24, 2] });
      setLogoPreview(salon.logo_url ?? null);
    }
  }, [salon]);

  useEffect(() => {
    if (!salon) return;
    supabase
      .from("salon_members")
      .select("user_id, role, profiles(name, email)")
      .eq("salon_id", salon.id)
      .eq("role", "cliente")
      .then(({ data }) => setSalonMembers(data || []));
  }, [salon]);

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const workingHours = Array.isArray(form.working_hours) ? form.working_hours : [];
  const reminderHours: number[] = Array.isArray(form.reminder_hours) ? form.reminder_hours : [24, 2];

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !salon) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande. Máx 2MB."); return; }

    const ext = file.name.split(".").pop();
    const path = `${salon.id}/logo.${ext}`;

    const { error: upErr } = await supabase.storage.from("salon-logos").upload(path, file, { upsert: true });
    if (upErr) { toast.error("Erro ao enviar logo: " + upErr.message); return; }

    const { data: { publicUrl } } = supabase.storage.from("salon-logos").getPublicUrl(path);
    setLogoPreview(publicUrl);
    setForm((f: any) => ({ ...f, logo_url: publicUrl }));
    toast.success("Logo enviada! Salve as configurações para confirmar.");
  };

  const handleHoursChange = (index: number, field: string, value: string | boolean) => {
    const updated = [...workingHours];
    updated[index] = { ...updated[index], [field]: value };
    setForm((f: any) => ({ ...f, working_hours: updated }));
  };

  const toggleReminder = (hours: number) => {
    const current: number[] = reminderHours;
    const updated = current.includes(hours) ? current.filter((h) => h !== hours) : [...current, hours].sort((a, b) => b - a);
    setForm((f: any) => ({ ...f, reminder_hours: updated }));
  };

  const handleSave = async () => {
    await updateSalon({
      name: form.name,
      description: form.description,
      address: form.address,
      phone: form.phone,
      logo_url: form.logo_url,
      client_link: form.client_link,
      primary_color: form.primary_color,
      accent_color: form.accent_color,
      notifications_enabled: form.notifications_enabled,
      working_hours: form.working_hours,
      reminder_hours: form.reminder_hours,
    } as any);
  };

  const handleSendNotification = async () => {
    if (!salon || !notifForm.title || !notifForm.message) {
      toast.error("Preencha título e mensagem.");
      return;
    }
    setSendingNotif(true);
    try {
      const targets = notifForm.target === "all"
        ? salonMembers.map((m) => m.user_id)
        : [notifForm.target];

      const inserts = targets.map((uid) => ({
        user_id: uid,
        salon_id: salon.id,
        type: "promocao",
        title: notifForm.title,
        message: notifForm.message,
      }));

      const { error } = await supabase.from("notifications").insert(inserts);
      if (error) throw error;
      toast.success(`Notificação enviada para ${targets.length} cliente(s)!`);
      setNotifForm({ title: "", message: "", target: "all" });
    } catch (e: any) {
      toast.error("Erro ao enviar: " + e.message);
    } finally {
      setSendingNotif(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie as informações e preferências do seu salão</p>
      </div>

      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="horarios">Horários</TabsTrigger>
          <TabsTrigger value="visual">Visual</TabsTrigger>
          <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
          <TabsTrigger value="enviar">Enviar Mensagem</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Camera className="h-5 w-5 text-primary" />
                Logo do Salão
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <div
                onClick={() => fileRef.current?.click()}
                className="flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted transition hover:border-primary"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Clique para enviar</p>
                <p className="text-xs text-muted-foreground">PNG, JPG ou SVG. Máx 2MB.</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome do salão</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefone (WhatsApp)</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Ex: 11999998888" />
              </div>
              <div className="col-span-full space-y-2">
                <Label>Endereço</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="col-span-full space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="horarios">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-primary" />
                Horários de Funcionamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {workingHours.map((wh: any, i: number) => (
                <div key={wh.day} className="flex items-center gap-4 rounded-lg border border-border p-3">
                  <Switch checked={wh.enabled} onCheckedChange={(v) => handleHoursChange(i, "enabled", v)} />
                  <span className="w-20 text-sm font-medium">{wh.day}</span>
                  {wh.enabled ? (
                    <>
                      <Input type="time" className="w-28" value={wh.open} onChange={(e) => handleHoursChange(i, "open", e.target.value)} />
                      <span className="text-muted-foreground">até</span>
                      <Input type="time" className="w-28" value={wh.close} onChange={(e) => handleHoursChange(i, "close", e.target.value)} />
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Fechado</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visual">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5 text-primary" />
                Identidade Visual
              </CardTitle>
              <CardDescription>Personalize as cores do seu salão</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cor primária</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="h-10 w-10 cursor-pointer rounded-md border border-border" />
                  <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="max-w-[120px]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor de destaque</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} className="h-10 w-10 cursor-pointer rounded-md border border-border" />
                  <Input value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} className="max-w-[120px]" />
                </div>
              </div>
              <div className="col-span-full mt-4">
                <p className="mb-2 text-sm font-medium">Preview</p>
                <div className="flex gap-3">
                  <div className="h-12 w-24 rounded-lg shadow-sm" style={{ backgroundColor: form.primary_color }} />
                  <div className="h-12 w-24 rounded-lg shadow-sm" style={{ backgroundColor: form.accent_color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5 text-primary" />
                Notificações Push
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Ativar notificações</p>
                  <p className="text-xs text-muted-foreground">Receba alertas de agendamentos e estoque</p>
                </div>
                <Switch checked={form.notifications_enabled} onCheckedChange={(v) => setForm({ ...form, notifications_enabled: v })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Novos agendamentos</p>
                  <p className="text-xs text-muted-foreground">Quando uma cliente agendar</p>
                </div>
                <Switch defaultChecked disabled={!form.notifications_enabled} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Estoque baixo</p>
                  <p className="text-xs text-muted-foreground">Quando produto atingir mínimo</p>
                </div>
                <Switch defaultChecked disabled={!form.notifications_enabled} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Anamnese respondida</p>
                  <p className="text-xs text-muted-foreground">Quando cliente responder ficha</p>
                </div>
                <Switch defaultChecked disabled={!form.notifications_enabled} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-primary" />
                Lembretes Automáticos
              </CardTitle>
              <CardDescription>Escolha quando enviar lembretes de agendamento às clientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {REMINDER_OPTIONS.map((opt) => (
                  <div
                    key={opt.value}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition hover:border-primary ${reminderHours.includes(opt.value) ? "border-primary bg-primary/5" : "border-border"}`}
                    onClick={() => toggleReminder(opt.value)}
                  >
                    <Checkbox
                      checked={reminderHours.includes(opt.value)}
                      onCheckedChange={() => toggleReminder(opt.value)}
                    />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </div>
                ))}
              </div>
              {reminderHours.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum lembrete ativo. Selecione pelo menos um.</p>
              )}
              {reminderHours.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Lembretes ativos: {reminderHours.sort((a, b) => b - a).map((h) => `${h}h antes`).join(", ")}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enviar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Send className="h-5 w-5 text-primary" />
                Enviar Notificação Personalizada
              </CardTitle>
              <CardDescription>Envie promoções, novidades ou avisos diretamente para suas clientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Destinatário</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={notifForm.target}
                  onChange={(e) => setNotifForm({ ...notifForm, target: e.target.value })}
                >
                  <option value="all">Todas as clientes ({salonMembers.length})</option>
                  {salonMembers.map((m: any) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profiles?.name || m.profiles?.email || m.user_id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  placeholder="Ex: Promoção de aniversário 🎉"
                  value={notifForm.title}
                  onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  placeholder="Ex: Esse mês seu aniversário garante 20% de desconto em qualquer serviço!"
                  value={notifForm.message}
                  onChange={(e) => setNotifForm({ ...notifForm, message: e.target.value })}
                  rows={4}
                  maxLength={300}
                />
                <p className="text-xs text-muted-foreground text-right">{notifForm.message.length}/300</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Pré-visualização</p>
                <p className="text-sm font-semibold">{notifForm.title || "Título da notificação"}</p>
                <p className="text-xs text-muted-foreground">{notifForm.message || "Mensagem aparecerá aqui..."}</p>
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleSendNotification}
                disabled={sendingNotif || !notifForm.title || !notifForm.message || salonMembers.length === 0}
              >
                {sendingNotif ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sendingNotif ? "Enviando..." : `Enviar para ${notifForm.target === "all" ? `todas (${salonMembers.length})` : "1 cliente"}`}
              </Button>
              {salonMembers.length === 0 && (
                <p className="text-xs text-center text-muted-foreground">Nenhuma cliente cadastrada ainda.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Salvar configurações
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
