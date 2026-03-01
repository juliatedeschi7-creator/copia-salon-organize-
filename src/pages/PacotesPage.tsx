import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/contexts/SalonContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, PackageOpen, Loader2, UserPlus, X } from "lucide-react";
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
  profiles: { name: string; email: string } | null;
}

const PacotesPage = () => {
  const { salon } = useSalon();

  const [packages, setPackages] = useState<Package[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<SalonClient[]>([]);
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
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    if (!salon) return;
    const [pkgRes, svcRes, clientRes] = await Promise.all([
      supabase
        .from("packages")
        .select("id, name, description, price, validity_days, is_active, package_items(service_id, quantity, services(name))")
        .eq("salon_id", salon.id)
        .order("name"),
      supabase.from("services").select("id, name, is_active").eq("salon_id", salon.id).eq("is_active", true).order("name"),
      supabase
        .from("salon_members")
        .select("user_id, profiles(name, email)")
        .eq("salon_id", salon.id)
        .eq("role", "cliente"),
    ]);
    setPackages((pkgRes.data as Package[]) ?? []);
    setServices((svcRes.data as Service[]) ?? []);
    setClients((clientRes.data as SalonClient[]) ?? []);
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
                        {c.profiles?.name ?? c.user_id}{c.profiles?.email ? ` — ${c.profiles.email}` : ""}
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
    </div>
  );
};

export default PacotesPage;
