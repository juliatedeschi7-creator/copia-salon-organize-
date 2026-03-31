import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, AlertCircle, RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/contexts/SalonContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type PaymentRow = {
  id: string;
  salon_id: string;
  client_user_id: string | null;
  amount: number;
  payment_date: string | null; // YYYY-MM-DD
  notes: string | null;
  created_at: string;
};

type ChargeRow = {
  id: string;
  salon_id: string;
  client_user_id: string | null;
  amount: number;
  description: string | null;
  status: string | null; // depends on your schema (paid/open/etc)
  created_at: string;
};

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const firstDayOfMonthISO = () => {
  const d = new Date();
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  return isoDate(first);
};

const FinanceiroPage = () => {
  const { salon } = useSalon();
  const { role } = useAuth();

  const isOwner = role === "dono";

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [charges, setCharges] = useState<ChargeRow[]>([]);

  const fetchData = async () => {
    if (!isOwner) {
      setLoading(false);
      setPayments([]);
      setCharges([]);
      return;
    }
    if (!salon) {
      setLoading(false);
      setPayments([]);
      setCharges([]);
      return;
    }

    setLoading(true);

    // payments: receitas reais
    const { data: payData, error: payErr } = await supabase
      .from("payments")
      .select("id, salon_id, client_user_id, amount, payment_date, notes, created_at")
      .eq("salon_id", salon.id)
      .order("created_at", { ascending: false });

    if (payErr) toast.error("Erro ao carregar pagamentos: " + payErr.message);

    // charges: cobranças (em aberto / total cobrado)
    const { data: chData, error: chErr } = await supabase
      .from("charges")
      .select("id, salon_id, client_user_id, amount, description, status, created_at")
      .eq("salon_id", salon.id)
      .order("created_at", { ascending: false });

    if (chErr) toast.error("Erro ao carregar cobranças: " + chErr.message);

    setPayments((payData ?? []) as PaymentRow[]);
    setCharges((chData ?? []) as ChargeRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salon?.id, role]);

  const today = isoDate(new Date());
  const monthStart = firstDayOfMonthISO();

  const receitaMes = useMemo(() => {
    return payments
      .filter((p) => (p.payment_date ?? p.created_at.slice(0, 10)) >= monthStart)
      .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  }, [payments, monthStart]);

  const receitaHoje = useMemo(() => {
    return payments
      .filter((p) => (p.payment_date ?? p.created_at.slice(0, 10)) === today)
      .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  }, [payments, today]);

  // "Em aberto": depende do seu schema de status.
  // Aqui assumo que status 'paid' significa pago; se não existir, trate como tudo em aberto.
  const emAberto = useMemo(() => {
    return charges
      .filter((c) => (c.status ?? "").toLowerCase() !== "paid" && (c.status ?? "").toLowerCase() !== "pago")
      .reduce((sum, c) => sum + Number(c.amount ?? 0), 0);
  }, [charges]);

  const fmtBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (!isOwner) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Acesso disponível apenas para Dono.</p>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">
          Nenhum salão carregado. Verifique seu vínculo em Configurações.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Resumo financeiro do seu salão</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{fmtBRL(receitaMes)}</p>
              <p className="text-xs text-muted-foreground">Receita do mês</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <DollarSign className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{fmtBRL(receitaHoje)}</p>
              <p className="text-xs text-muted-foreground">Receita de hoje</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{fmtBRL(emAberto)}</p>
              <p className="text-xs text-muted-foreground">Em aberto (cobranças)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimos pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
            ) : (
              <div className="space-y-2">
                {payments.slice(0, 8).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{fmtBRL(Number(p.amount ?? 0))}</p>
                      <p className="text-xs text-muted-foreground">
                        Data: {(p.payment_date ?? p.created_at.slice(0, 10))}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.notes ?? ""}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimas cobranças</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : charges.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma cobrança registrada.</p>
            ) : (
              <div className="space-y-2">
                {charges.slice(0, 8).map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.description ?? "Cobrança"}</p>
                      <p className="text-xs text-muted-foreground">
                        Status: {c.status ?? "—"}
                      </p>
                    </div>
                    <p className="text-sm font-medium">{fmtBRL(Number(c.amount ?? 0))}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinanceiroPage;