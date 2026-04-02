import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, Plus, ArrowUpCircle, ArrowDownCircle, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/contexts/SalonContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type InventoryItem = {
  id: string;
  salon_id: string;
  name: string;
  category: string | null;
  unit: string | null;
  min_qty: number | null;
  current_qty: number | null;
  is_active: boolean | null;
};

type MovementType = "in" | "out" | "adjust";

const EstoquePage = () => {
  const { salon } = useSalon();
  const { user, role } = useAuth();

  const isStaff = role === "dono" || role === "funcionario";

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);

  // Create item dialog
  const [openNew, setOpenNew] = useState(false);
  const [newForm, setNewForm] = useState({
    name: "",
    category: "",
    unit: "un",
    min_qty: "",
    current_qty: "",
  });
  const [savingNew, setSavingNew] = useState(false);

  // Movement dialog
  const [openMove, setOpenMove] = useState(false);
  const [moveItem, setMoveItem] = useState<InventoryItem | null>(null);
  const [moveType, setMoveType] = useState<MovementType>("in");
  const [moveQty, setMoveQty] = useState("");
  const [moveNotes, setMoveNotes] = useState("");
  const [savingMove, setSavingMove] = useState(false);

  const fetchItems = async () => {
    if (!isStaff) {
      setLoading(false);
      setItems([]);
      return;
    }
    if (!user || !salon) {
      setLoading(false);
      setItems([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("inventory_items")
      .select("id, salon_id, name, category, unit, min_qty, current_qty, is_active")
      .eq("salon_id", salon.id)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar estoque: " + error.message);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as InventoryItem[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salon?.id, user?.id, role]);

  const lowStockCount = useMemo(() => {
    return items.filter((i) => (i.current_qty ?? 0) <= (i.min_qty ?? 0)).length;
  }, [items]);

  const openMovement = (item: InventoryItem, type: MovementType) => {
    setMoveItem(item);
    setMoveType(type);
    setMoveQty("");
    setMoveNotes("");
    setOpenMove(true);
  };

  const handleCreateItem = async () => {
    if (!salon || !user) return;

    if (!newForm.name.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }

    const minQty = newForm.min_qty.trim() === "" ? null : Number(newForm.min_qty);
    const currentQty = newForm.current_qty.trim() === "" ? 0 : Number(newForm.current_qty);

    if (minQty !== null && Number.isNaN(minQty)) {
      toast.error("Mínimo inválido.");
      return;
    }
    if (Number.isNaN(currentQty)) {
      toast.error("Quantidade inválida.");
      return;
    }

    setSavingNew(true);

    const { error } = await supabase.from("inventory_items").insert({
      salon_id: salon.id,
      name: newForm.name.trim(),
      category: newForm.category.trim() || null,
      unit: newForm.unit.trim() || "un",
      min_qty: minQty,
      current_qty: currentQty,
      is_active: true,
    });

    setSavingNew(false);

    if (error) {
      toast.error("Erro ao criar produto: " + error.message);
      return;
    }

    toast.success("Produto criado!");
    setOpenNew(false);
    setNewForm({ name: "", category: "", unit: "un", min_qty: "", current_qty: "" });
    fetchItems();
  };

  const handleSaveMovement = async () => {
    if (!salon || !user || !moveItem) return;

    const qty = Number(moveQty);
    if (!qty || Number.isNaN(qty) || qty <= 0) {
      toast.error("Informe uma quantidade válida (maior que zero).");
      return;
    }

    const current = Number(moveItem.current_qty ?? 0);

    let next = current;
    if (moveType === "in") next = current + qty;
    if (moveType === "out") next = current - qty;
    if (moveType === "adjust") next = qty;

    if (next < 0) {
      toast.error("A quantidade não pode ficar negativa.");
      return;
    }

    setSavingMove(true);

    // 1) registra movimento
    const { error: movErr } = await supabase.from("inventory_movements").insert({
      salon_id: salon.id,
      item_id: moveItem.id,
      type: moveType,
      qty,
      notes: moveNotes.trim() || null,
      created_by: user.id,
    });

    if (movErr) {
      setSavingMove(false);
      toast.error("Erro ao salvar movimentação: " + movErr.message);
      return;
    }

    // 2) atualiza saldo
    const { error: updErr } = await supabase
      .from("inventory_items")
      .update({ current_qty: next })
      .eq("id", moveItem.id)
      .eq("salon_id", salon.id);

    setSavingMove(false);

    if (updErr) {
      toast.error("Movimentação criada, mas erro ao atualizar saldo: " + updErr.message);
      setOpenMove(false);
      fetchItems();
      return;
    }

    toast.success("Movimentação salva!");
    setOpenMove(false);
    fetchItems();
  };

  if (!isStaff) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Estoque</h1>
        <p className="text-sm text-muted-foreground">Acesso disponível apenas para Dono/Funcionário.</p>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Estoque</h1>
        <p className="text-sm text-muted-foreground">Nenhum salão carregado. Vá em Configurações e verifique seu vínculo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estoque</h1>
          <p className="text-sm text-muted-foreground">Controle de produtos e insumos</p>
          {lowStockCount > 0 && (
            <p className="mt-1 text-xs text-destructive">
              Atenção: {lowStockCount} item(ns) com estoque baixo.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchItems} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          </Button>
          <Button onClick={() => setOpenNew(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            Produtos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum produto cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {items.map((p) => {
                const qty = Number(p.current_qty ?? 0);
                const min = Number(p.min_qty ?? 0);
                const unit = p.unit ?? "un";
                const low = qty <= min;

                return (
                  <div key={p.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.category ?? "Sem categoria"}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {qty} {unit}
                        </span>
                        {low && (
                          <Badge variant="outline" className="gap-1 border-destructive/30 bg-destructive/10 text-destructive">
                            <AlertTriangle className="h-3 w-3" /> Baixo
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openMovement(p, "in")} className="gap-2">
                        <ArrowUpCircle className="h-4 w-4" /> Entrada
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openMovement(p, "out")} className="gap-2">
                        <ArrowDownCircle className="h-4 w-4" /> Saída
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openMovement(p, "adjust")} className="gap-2">
                        <RefreshCcw className="h-4 w-4" /> Ajuste
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Novo produto */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo produto</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={newForm.name} onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))} />
            </div>

            <div className="space-y-1">
              <Label>Categoria</Label>
              <Input
                value={newForm.category}
                onChange={(e) => setNewForm((p) => ({ ...p, category: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Unidade</Label>
                <Input value={newForm.unit} onChange={(e) => setNewForm((p) => ({ ...p, unit: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Estoque mínimo</Label>
                <Input
                  inputMode="decimal"
                  value={newForm.min_qty}
                  onChange={(e) => setNewForm((p) => ({ ...p, min_qty: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Quantidade inicial</Label>
              <Input
                inputMode="decimal"
                value={newForm.current_qty}
                onChange={(e) => setNewForm((p) => ({ ...p, current_qty: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpenNew(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateItem} disabled={savingNew}>
                {savingNew && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Movimentação */}
      <Dialog open={openMove} onOpenChange={setOpenMove}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {moveType === "in" ? "Entrada" : moveType === "out" ? "Saída" : "Ajuste"} de estoque
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Produto: <span className="font-medium text-foreground">{moveItem?.name}</span>
            </p>

            <div className="space-y-1">
              <Label>
                {moveType === "adjust" ? "Nova quantidade" : "Quantidade"} *
              </Label>
              <Input inputMode="decimal" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={moveNotes} onChange={(e) => setMoveNotes(e.target.value)} rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpenMove(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveMovement} disabled={savingMove}>
                {savingMove && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EstoquePage;