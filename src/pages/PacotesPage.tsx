import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/contexts/SalonContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, PackageOpen, Loader2, UserPlus, X, ClipboardList } from "lucide-react";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  is_active: boolean;
}

interface PackageItem {
  service_id: string;
  quantity: number;
}

interface Package {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  validity_days: number;
  is_active: boolean;
  package_items: { service_id: string; quantity: number; services: { name: string } }[];
}

interface SalonClient {
  user_id: string;
  profiles: { full_name: string; email: string } | null;
}

interface ClientPackage {
  id: string;
  client_user_id: string;
  package_id: string;
  status: string;
  purchased_at: string;
  expires_at: string;
  sessions_used: number;
  packages: { name: string } | null;
}

const cpStatusLabel: Record<string, string> = {
  contratado: "Contratado",
  ativo: "Ativo",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const cpStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  contratado: "outline",
  ativo: "default",
  finalizado: "secondary",
  cancelado: "destructive",
};

const sessionStatusLabel: Record<string, string> = {
  realizado: "Realizado",
  nao_avisou: "Não avisou",
  avisou_menos_2h: "Avisou com menos de 2h",
};

const PacotesPage = () => {
  const { salon } = useSalon();
  const { user } = useAuth();

  const [packages, setPackages] = useState<Package[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<SalonClient[]>([]);
  const [clientPackages, setClientPackages] = useState<ClientPackage[]>([]);
  const [loading, setLoading] = useState(true);

  // Package dialog
  const [pkgDialogOpen, setPkgDialogOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Package | null>(null);
  const [pkgName, setPkgName] = useState("");
  const [pkgDescription, setPkgDescription] = useState("");
  const [pkgPrice, setPkgPrice] = useState<number | "">("");
  const [pkgValidityDays, setPkgValidityDays] = useState(30);
  const [pkgIsActive, setPkgIsActive] = useState(true);
  const [pkgItems, setPkgItems] = useState<PackageItem[]>([]);
  const [savingPkg, setSavingPkg] = useState(false);

  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignPkg, setAssignPkg] = useState<Package | null>(null);
  const [assignClientId, setAssignClientId] = useState("");
  const [assignPurchasedAt, setAssignPurchasedAt] = useState(new Date().toISOString().slice(0, 10));
  const [assignStatus, setAssignStatus] = useState("contratado");
  const [assigning, setAssigning] = useState(false);

  // Session registration dialog
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionCp, setSessionCp] = useState<ClientPackage | null>(null);
  const [sessionStatus, setSessionStatus] = useState("realizado");
  const [sessionNotes, setSessionNotes] = useState("");
  const [savingSession, setSavingSession] = useState(false);

  const fetchData = async () => {
    if (!salon) return;
    const [pkgRes, svcRes, clientRes, cpRes] = await Promise.all([
      supabase
        .from("packages")
        .select("id, name, description, price, validity_days, is_active, package_items(service_id, quantity, services(name))")
        .eq("salon_id", salon.id)
        .order("name"),
      supabase.from("services").select("id, name, is_active").eq("salon_id", salon.id).eq("is_active", true).order("name"),
      supabase
        .from("salon_members")
        .select("user_id, profiles(full_name, email)")
        .eq("salon_id", salon.id)
        .eq("role", "cliente"),
      supabase
        .from("client_packages")
        .select("id, client_user_id, package_id, status, purchased_at, expires_at, sessions_used, packages(name)")
        .eq("salon_id", salon.id)
        .order("purchased_at", { ascending: false }),
    ]);
    setPackages((pkgRes.data as Package[]) ?? []);
    setServices((svcRes.data as Service[]) ?? []);
    setClients((clientRes.data as SalonClient[]) ?? []);
    setClientPackages((cpRes.data as ClientPackage[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [salon]);

  // Package dialog helpers
  const openNew = () => {
    setEditingPkg(null);
    setPkgName("");
    setPkgDescription("");
    setPkgPrice("");
    setPkgValidityDays(30);
    setPkgIsActive(true);
    setPkgItems([]);
    setPkgDialogOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditingPkg(pkg);
    setPkgName(pkg.name);
    setPkgDescription(pkg.description ?? "");
    setPkgPrice(pkg.price ?? "");
    setPkgValidityDays(pkg.validity_days);
    setPkgIsActive(pkg.is_active);
    setPkgItems(pkg.package_items.map((i) => ({ service_id: i.service_id, quantity: i.quantity })));
    setPkgDialogOpen(true);
  };

  const addPkgItem = () => {
    const usedIds = pkgItems.map((i) => i.service_id);
    const first = services.find((s) => !usedIds.includes(s.id));
    if (!first) { toast.error("Todos os serviços já foram adicionados"); return; }
    setPkgItems([...pkgItems, { service_id: first.id, quantity: 1 }]);
  };

  const updatePkgItemService = (index: number, serviceId: string) => {
    const updated = [...pkgItems];
    updated[index] = { ...updated[index], service_id: serviceId };
    setPkgItems(updated);
  };

  const updatePkgItemQty = (index: number, qty: number) => {
    const updated = [...pkgItems];
    updated[index] = { ...updated[index], quantity: Math.max(1, qty) };
    setPkgItems(updated);
  };

  const removePkgItem = (index: number) => {
    setPkgItems(pkgItems.filter((_, i) => i !== index));
  };

  const handleSavePkg = async () => {
    if (!salon || !pkgName.trim()) { toast.error("Nome é obrigatório"); return; }
    if (pkgItems.length === 0) { toast.error("Adicione ao menos um serviço ao pacote"); return; }
    // check duplicate services
    const serviceIds = pkgItems.map((i) => i.service_id);
    if (new Set(serviceIds).size !== serviceIds.length) { toast.error("Serviços duplicados no pacote"); return; }

    setSavingPkg(true);
    try {
      if (editingPkg) {
        const { error } = await supabase
          .from("packages")
          .update({ name: pkgName.trim(), description: pkgDescription, price: pkgPrice === "" ? null : Number(pkgPrice), validity_days: pkgValidityDays, is_active: pkgIsActive })
          .eq("id", editingPkg.id);
        if (error) throw error;
        // replace package_items
        await supabase.from("package_items").delete().eq("package_id", editingPkg.id);
        const { error: itemErr } = await supabase.from("package_items").insert(
          pkgItems.map((i) => ({ package_id: editingPkg.id, service_id: i.service_id, quantity: i.quantity }))
        );
        if (itemErr) throw itemErr;
        toast.success("Pacote atualizado");
      } else {
        const { data: newPkg, error } = await supabase
          .from("packages")
          .insert({ salon_id: salon.id, name: pkgName.trim(), description: pkgDescription, price: pkgPrice === "" ? null : Number(pkgPrice), validity_days: pkgValidityDays, is_active: pkgIsActive })
          .select("id")
          .single();
        if (error || !newPkg) throw error;
        const { error: itemErr } = await supabase.from("package_items").insert(
          pkgItems.map((i) => ({ package_id: newPkg.id, service_id: i.service_id, quantity: i.quantity }))
        );
        if (itemErr) throw itemErr;
        toast.success("Pacote criado");
      }
      setPkgDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      toast.error("Erro ao salvar pacote");
      console.error(err);
    } finally {
      setSavingPkg(false);
    }
  };

  const handleDelete = async (pkg: Package) => {
    if (!confirm(`Excluir pacote "${pkg.name}"?`)) return;
    const { error } = await supabase.from("packages").delete().eq("id", pkg.id);
    if (error) { toast.error("Erro ao excluir pacote"); return; }
    toast.success("Pacote excluído");
    fetchData();
  };

  // Assign helpers
  const openAssign = (pkg: Package) => {
    setAssignPkg(pkg);
    setAssignClientId("");
    setAssignPurchasedAt(new Date().toISOString().slice(0, 10));
    setAssignStatus("contratado");
    setAssignDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!salon || !assignPkg || !assignClientId) { toast.error("Selecione um cliente"); return; }
    setAssigning(true);
    try {
      const purchasedDate = new Date(assignPurchasedAt + "T00:00:00");
      const expiresDate = new Date(purchasedDate);
      expiresDate.setDate(expiresDate.getDate() + assignPkg.validity_days);

      const { data: cp, error: cpErr } = await supabase
        .from("client_packages")
        .insert({
          salon_id: salon.id,
          package_id: assignPkg.id,
          client_user_id: assignClientId,
          purchased_at: purchasedDate.toISOString(),
          expires_at: expiresDate.toISOString(),
          status: assignStatus,
        })
        .select("id")
        .single();
      if (cpErr || !cp) throw cpErr;

      if (assignPkg.package_items.length > 0) {
        const { error: ciErr } = await supabase.from("client_package_items").insert(
          assignPkg.package_items.map((i) => ({
            client_package_id: cp.id,
            service_id: i.service_id,
            quantity_total: i.quantity,
            quantity_used: 0,
          }))
        );
        if (ciErr) throw ciErr;
      }

      toast.success("Pacote atribuído ao cliente");
      setAssignDialogOpen(false);
    } catch (err: unknown) {
      toast.error("Erro ao atribuir pacote");
      console.error(err);
    } finally {
      setAssigning(false);
    }
  };

  // Session helpers
  const openSession = (cp: ClientPackage) => {
    setSessionCp(cp);
    setSessionStatus("realizado");
    setSessionNotes("");
    setSessionDialogOpen(true);
  };

  const handleRegisterSession = async () => {
    if (!salon || !sessionCp || !user) return;
    setSavingSession(true);
    try {
      const { error: sessErr } = await supabase.from("package_sessions").insert({
        salon_id: salon.id,
        client_user_id: sessionCp.client_user_id,
        client_package_id: sessionCp.id,
        status: sessionStatus,
        notes: sessionNotes || null,
        created_by: user.id,
      });
      if (sessErr) throw sessErr;

      // Increment sessions_used and activate if still contracted
      const newUsed = sessionCp.sessions_used + 1;
      const newStatus = sessionCp.status === "contratado" ? "ativo" : sessionCp.status;
      const { error: updateErr } = await supabase
        .from("client_packages")
        .update({ sessions_used: newUsed, status: newStatus })
        .eq("id", sessionCp.id);
      if (updateErr) throw updateErr;

      toast.success("Sessão registrada!");
      setSessionDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      toast.error("Erro ao registrar sessão");
      console.error(err);
    } finally {
      setSavingSession(false);
    }
  };

  const clientName = useMemo(() => {
    const map = new Map(clients.map((c) => [c.user_id, c]));
    return (userId: string) => {
      const c = map.get(userId);
      return c?.profiles?.full_name ?? c?.profiles?.email ?? userId.slice(0, 8) + "…";
    };
  }, [clients]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PackageOpen className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">Pacotes</h1>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Novo Pacote
        </Button>
      </div>

      {packages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum pacote cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} className={pkg.is_active ? "" : "opacity-60"}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{pkg.name}</CardTitle>
                  <Badge variant={pkg.is_active ? "default" : "secondary"}>
                    {pkg.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                {pkg.description && (
                  <p className="text-xs text-muted-foreground">{pkg.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  {pkg.package_items.map((item) => (
                    <div key={item.service_id} className="flex items-center justify-between text-sm">
                      <span>{item.services.name}</span>
                      <span className="font-medium text-primary">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Validade: {pkg.validity_days} dias</span>
                  {pkg.price != null && (
                    <span className="font-semibold text-foreground">
                      R$ {Number(pkg.price).toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(pkg)} className="flex-1">
                    <Pencil className="mr-1 h-3 w-3" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openAssign(pkg)} className="flex-1">
                    <UserPlus className="mr-1 h-3 w-3" /> Atribuir
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(pkg)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Package create/edit dialog */}
      <Dialog open={pkgDialogOpen} onOpenChange={setPkgDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPkg ? "Editar Pacote" : "Novo Pacote"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="pkg-name">Nome *</Label>
              <Input id="pkg-name" value={pkgName} onChange={(e) => setPkgName(e.target.value)} placeholder="Ex: Pacote Mãos e Pés" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pkg-desc">Descrição</Label>
              <Textarea id="pkg-desc" value={pkgDescription} onChange={(e) => setPkgDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pkg-price">Preço (R$)</Label>
                <Input id="pkg-price" type="number" min={0} step={0.01} value={pkgPrice} onChange={(e) => setPkgPrice(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Opcional" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pkg-validity">Validade (dias) *</Label>
                <Input id="pkg-validity" type="number" min={1} value={pkgValidityDays} onChange={(e) => setPkgValidityDays(Math.max(1, Number(e.target.value)))} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="pkg-active" checked={pkgIsActive} onCheckedChange={setPkgIsActive} />
              <Label htmlFor="pkg-active">Ativo</Label>
            </div>

            {/* Package items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Serviços do pacote *</Label>
                <Button type="button" size="sm" variant="outline" onClick={addPkgItem}>
                  <Plus className="mr-1 h-3 w-3" /> Adicionar serviço
                </Button>
              </div>
              {pkgItems.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum serviço adicionado.</p>
              )}
              {pkgItems.map((item, idx) => {
                const usedIds = pkgItems.map((i, j) => (j !== idx ? i.service_id : null)).filter(Boolean) as string[];
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <Select value={item.service_id} onValueChange={(v) => updatePkgItemService(idx, v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((svc) => (
                          <SelectItem key={svc.id} value={svc.id} disabled={usedIds.includes(svc.id)}>
                            {svc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updatePkgItemQty(idx, Number(e.target.value))}
                      className="w-20"
                    />
                    <Button type="button" size="icon" variant="ghost" onClick={() => removePkgItem(idx)} className="text-destructive hover:text-destructive">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPkgDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSavePkg} disabled={savingPkg}>
                {savingPkg && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir Pacote ao Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {assignPkg && (
              <p className="text-sm font-medium">Pacote: <span className="text-primary">{assignPkg.name}</span></p>
            )}
            <div className="space-y-1">
              <Label>Cliente *</Label>
              {clients.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum cliente registrado no salão.</p>
              ) : (
                <Select value={assignClientId} onValueChange={setAssignClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.user_id} value={c.user_id}>
                        {c.profiles?.full_name ?? c.user_id}{c.profiles?.email ? ` — ${c.profiles.email}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="assign-date">Data de compra *</Label>
              <Input id="assign-date" type="date" value={assignPurchasedAt} onChange={(e) => setAssignPurchasedAt(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Status inicial</Label>
              <Select value={assignStatus} onValueChange={setAssignStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contratado">Contratado (pago, sem sessões iniciadas)</SelectItem>
                  <SelectItem value="ativo">Ativo (em andamento)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {assignPkg && (
              <p className="text-xs text-muted-foreground">
                Expira em: {assignPkg.validity_days} dias a partir da data de compra
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAssign} disabled={assigning || !assignClientId}>
                {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Atribuir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client packages (assigned) section */}
      {clientPackages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Pacotes Atribuídos</h2>
          </div>
          <div className="space-y-2">
            {clientPackages.map((cp) => (
              <div
                key={cp.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{cp.packages?.name ?? "Pacote"}</p>
                    <Badge variant={cpStatusVariant[cp.status] ?? "secondary"}>
                      {cpStatusLabel[cp.status] ?? cp.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {clientName(cp.client_user_id)} · {cp.sessions_used} sessão(ões) registrada(s)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expira: {new Date(cp.expires_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                {cp.status !== "finalizado" && cp.status !== "cancelado" && (
                  <Button size="sm" variant="outline" onClick={() => openSession(cp)} className="ml-3 shrink-0">
                    <Plus className="mr-1 h-3 w-3" /> Sessão
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session registration dialog */}
      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Sessão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {sessionCp && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium">{sessionCp.packages?.name ?? "Pacote"}</p>
                <p className="text-xs text-muted-foreground">{clientName(sessionCp.client_user_id)}</p>
              </div>
            )}
            <div className="space-y-1">
              <Label>Status da sessão *</Label>
              <Select value={sessionStatus} onValueChange={setSessionStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sessionStatusLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Observação</Label>
              <Textarea
                placeholder="Ex: Cliente chegou 10 min atrasada"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSessionDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleRegisterSession} disabled={savingSession}>
                {savingSession && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PacotesPage;
