import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/contexts/SalonContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fetchSalonClients } from "@/lib/salonClients";

interface Charge {
  id: string;
  salon_id: string;
  client_user_id: string;
  description: string;
  amount: number;
  due_date: string | null;
  status: "pendente" | "pago" | "cancelado";
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
}

interface Payment {
  id: string;
  charge_id: string | null;
  client_user_id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

interface ClientOption {
  user_id: string;
  name: string | null;
  email: string | null;
}

const statusIcon: Record<string, React.ReactNode> = {
  pendente: <Clock className="h-4 w-4 text-yellow-500" />,
  pago: <CheckCircle className="h-4 w-4 text-green-500" />,
  cancelado: <XCircle className="h-4 w-4 text-muted-foreground" />,
};

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  cancelado: "Cancelado",
};

const statusClass: Record<string, string> = {
  pendente: "text-yellow-600 bg-yellow-50 border-yellow-200",
  pago: "text-green-700 bg-green-50 border-green-200",
  cancelado: "text-muted-foreground bg-muted border-border",
};

const ContasPage = () => {
  const { salon } = useSalon();
  const { user, role } = useAuth();
  const isOwner = role === "dono" || role === "admin";

  const [charges, setCharges] = useState<Charge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);

  // New charge dialog
  const [showChargeDialog, setShowChargeDialog] = useState(false);
  const [chargeForm, setChargeForm] = useState({
    client_user_id: "",
    description: "",
    amount: "",
    due_date: "",
  });
  const [savingCharge, setSavingCharge] = useState(false);

  // Mark as paid dialog
  const [payingCharge, setPayingCharge] = useState<Charge | null>(null);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  // Avulso payment dialog
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    client_user_id: "",
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [savingAvulso, setSavingAvulso] = useState(false);

  const fetchData = useCallback(async () => {
    if (!salon && isOwner) { setLoading(false); return; }
    if (!user) { setLoading(false); return; }

    setLoading(true);

    if (isOwner && salon) {
      // Fetch all charges for this salon (with client profile)
      const { data: chargesData, error: chargesErr } = await supabase
        .from("charges")
        .select("*, profiles(full_name, email)")
        .eq("salon_id", salon.id)
        .order("created_at", { ascending: false });

      if (chargesErr) toast.error("Erro ao carregar cobranças: " + chargesErr.message);
      else setCharges((chargesData ?? []) as Charge[]);

      // Fetch all payments for this salon
      const { data: paymentsData, error: paymentsErr } = await supabase
        .from("payments")
        .select("*")
        .eq("salon_id", salon.id)
        .order("created_at", { ascending: false });

      if (paymentsErr) toast.error("Erro ao carregar pagamentos: " + paymentsErr.message);
      else setPayments((paymentsData ?? []) as Payment[]);

      // Fetch client list for the selector
      const salonClientsList = await fetchSalonClients(salon.id);
      setClients(
        salonClientsList.map((c) => ({
          user_id: c.user_id,
          name: c.displayName !== "Cliente" ? c.displayName : null,
          email: c.email,
        }))
      );
    } else {
      // Client view: own charges and payments only
      const { data: chargesData, error: chargesErr } = await supabase
        .from("charges")
        .select("*")
        .eq("client_user_id", user.id)
        .order("created_at", { ascending: false });

      if (chargesErr) toast.error("Erro ao carregar cobranças: " + chargesErr.message);
      else setCharges((chargesData ?? []) as Charge[]);

      const { data: paymentsData, error: paymentsErr } = await supabase
        .from("payments")
        .select("*")
        .eq("client_user_id", user.id)
        .order("created_at", { ascending: false });

      if (paymentsErr) toast.error("Erro ao carregar pagamentos: " + paymentsErr.message);
      else setPayments((paymentsData ?? []) as Payment[]);
    }

    setLoading(false);
  }, [salon, user, isOwner]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateCharge = async () => {
    if (!salon || !user) return;
    if (!chargeForm.client_user_id || !chargeForm.description || !chargeForm.amount) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setSavingCharge(true);
    const { error } = await supabase.from("charges").insert({
      salon_id: salon.id,
      client_user_id: chargeForm.client_user_id,
      description: chargeForm.description,
      amount: parseFloat(chargeForm.amount),
      due_date: chargeForm.due_date || null,
      created_by: user.id,
    });
    if (error) {
      toast.error("Erro ao criar cobrança: " + error.message);
    } else {
      toast.success("Cobrança criada!");
      setShowChargeDialog(false);
      setChargeForm({ client_user_id: "", description: "", amount: "", due_date: "" });
      fetchData();
    }
    setSavingCharge(false);
  };

  const handleDeleteCharge = async (charge: Charge) => {
    if (!confirm(`Excluir cobrança "${charge.description}"?`)) return;
    const { error } = await supabase.from("charges").delete().eq("id", charge.id);
    if (error) toast.error("Erro ao excluir: " + error.message);
    else { toast.success("Cobrança excluída."); fetchData(); }
  };

  const handleMarkPaid = async () => {
    if (!payingCharge || !salon || !user) return;
    setSavingPayment(true);
    // Create payment record
    const { error: payErr } = await supabase.from("payments").insert({
      charge_id: payingCharge.id,
      salon_id: salon.id,
      client_user_id: payingCharge.client_user_id,
      amount: payingCharge.amount,
      payment_date: new Date().toISOString().split("T")[0],
      notes: paymentNotes || "",
      created_by: user.id,
    });
    if (payErr) { toast.error("Erro ao registrar pagamento: " + payErr.message); setSavingPayment(false); return; }

    // Update charge status to 'pago'
    const { error: updateErr } = await supabase
      .from("charges")
      .update({ status: "pago" })
      .eq("id", payingCharge.id);
    if (updateErr) toast.error("Erro ao atualizar status: " + updateErr.message);
    else { toast.success("Pagamento registrado!"); setPayingCharge(null); setPaymentNotes(""); fetchData(); }
    setSavingPayment(false);
  };

  const handleCancelCharge = async (charge: Charge) => {
    if (!confirm(`Cancelar cobrança "${charge.description}"?`)) return;
    const { error } = await supabase
      .from("charges")
      .update({ status: "cancelado" })
      .eq("id", charge.id);
    if (error) toast.error("Erro ao cancelar: " + error.message);
    else { toast.success("Cobrança cancelada."); fetchData(); }
  };

  const handleCreateAvulsoPayment = async () => {
    if (!salon || !user) return;
    if (!paymentForm.client_user_id || !paymentForm.amount || !paymentForm.payment_date) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setSavingAvulso(true);
    const { error } = await supabase.from("payments").insert({
      charge_id: null,
      salon_id: salon.id,
      client_user_id: paymentForm.client_user_id,
      amount: parseFloat(paymentForm.amount),
      payment_date: paymentForm.payment_date,
      notes: paymentForm.notes || "",
      created_by: user.id,
    });
    if (error) {
      toast.error("Erro ao registrar pagamento: " + error.message);
    } else {
      toast.success("Pagamento avulso registrado!");
      setShowPaymentDialog(false);
      setPaymentForm({ client_user_id: "", amount: "", payment_date: new Date().toISOString().split("T")[0], notes: "" });
      fetchData();
    }
    setSavingAvulso(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCharges = charges.filter((c) => c.status === "pendente");
  const paidCharges = charges.filter((c) => c.status === "pago");
  const cancelledCharges = charges.filter((c) => c.status === "cancelado");

  const pendingTotal = pendingCharges.reduce((s, c) => s + Number(c.amount), 0);
  const unallocatedPaymentsTotal = payments
    .filter((p) => p.charge_id === null)
    .reduce((s, p) => s + Number(p.amount), 0);
  const aReceber = Math.max(0, pendingTotal - unallocatedPaymentsTotal);

  const clientLabel = (c: Charge) => {
    if (isOwner) {
      return (c as any).profiles?.full_name || (c as any).profiles?.email || c.client_user_id;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contas</h1>
          <p className="text-sm text-muted-foreground">
            {isOwner ? "Cobranças e histórico de pagamentos" : "Suas cobranças e pagamentos"}
          </p>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setShowPaymentDialog(true)}>
              <Receipt className="h-4 w-4" /> Novo pagamento
            </Button>
            <Button className="gap-2" onClick={() => setShowChargeDialog(true)}>
              <Plus className="h-4 w-4" /> Nova cobrança
            </Button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      {isOwner && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-yellow-50">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {pendingCharges.length}
                </p>
                <p className="text-xs text-muted-foreground">Pendências</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  R$ {payments.reduce((s, p) => s + Number(p.amount), 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Total recebido</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  R$ {aReceber.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">A receber</p>
                {unallocatedPaymentsTotal > 0 && (
                  <p className="text-xs text-green-600">
                    − R$ {unallocatedPaymentsTotal.toFixed(2)} pagamentos avulsos
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending charges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-yellow-500" />
            Pendências ({pendingCharges.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingCharges.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma pendência.</p>
          ) : (
            <div className="space-y-3">
              {pendingCharges.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="space-y-0.5">
                    {isOwner && (
                      <p className="text-xs text-muted-foreground">{clientLabel(c)}</p>
                    )}
                    <p className="text-sm font-medium">{c.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">R$ {Number(c.amount).toFixed(2)}</span>
                      {c.due_date && <span>· Vence: {new Date(c.due_date + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                    </div>
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => { setPayingCharge(c); setPaymentNotes(""); }}
                      >
                        <CheckCircle className="h-3 w-3" /> Pago
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleCancelCharge(c)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteCharge(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5 text-primary" />
            Histórico de Pagamentos ({payments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="space-y-0.5">
                    {isOwner && (() => {
                      const charge = charges.find((c) => c.id === p.charge_id);
                      return charge ? (
                        <p className="text-xs text-muted-foreground">{clientLabel(charge)}</p>
                      ) : null;
                    })()}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>{new Date(p.payment_date + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                      {p.notes && <span>· {p.notes}</span>}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-green-600">
                    R$ {Number(p.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other charges (paid / cancelled) – owner only */}
      {isOwner && (paidCharges.length > 0 || cancelledCharges.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              Outras Cobranças
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...paidCharges, ...cancelledCharges].map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 opacity-70"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{clientLabel(c)}</p>
                    <p className="text-sm font-medium">{c.description}</p>
                    <p className="text-xs text-muted-foreground">R$ {Number(c.amount).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                        statusClass[c.status]
                      )}
                    >
                      {statusIcon[c.status]}
                      {statusLabel[c.status]}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteCharge(c)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create charge dialog */}
      <Dialog open={showChargeDialog} onOpenChange={setShowChargeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Cobrança</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select
                value={chargeForm.client_user_id}
                onValueChange={(v) => setChargeForm({ ...chargeForm, client_user_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.user_id} value={c.user_id}>
                      {c.name || c.email || c.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clients.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma cliente cadastrada.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                placeholder="Ex: Coloração + corte"
                value={chargeForm.description}
                onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={chargeForm.amount}
                onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de vencimento</Label>
              <Input
                type="date"
                value={chargeForm.due_date}
                onChange={(e) => setChargeForm({ ...chargeForm, due_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChargeDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCharge} disabled={savingCharge}>
              {savingCharge && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar cobrança
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as paid dialog */}
      <Dialog open={!!payingCharge} onOpenChange={(o) => { if (!o) setPayingCharge(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          {payingCharge && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium">{payingCharge.description}</p>
                <p className="text-muted-foreground">R$ {Number(payingCharge.amount).toFixed(2)}</p>
              </div>
              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  placeholder="Ex: Pago via Pix"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayingCharge(null)}>
              Cancelar
            </Button>
            <Button onClick={handleMarkPaid} disabled={savingPayment} className="gap-2">
              {savingPayment && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Avulso payment dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={(o) => { if (!o) setShowPaymentDialog(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Pagamento Avulso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select
                value={paymentForm.client_user_id}
                onValueChange={(v) => setPaymentForm({ ...paymentForm, client_user_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.user_id} value={c.user_id}>
                      {c.name || c.email || c.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clients.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma cliente cadastrada.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Data do pagamento *</Label>
              <Input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Ex: Pago via Pix"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateAvulsoPayment} disabled={savingAvulso} className="gap-2">
              {savingAvulso && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContasPage;
