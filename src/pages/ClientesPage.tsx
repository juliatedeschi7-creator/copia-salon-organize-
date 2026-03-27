import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/contexts/SalonContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Phone,
  Link as LinkIcon,
  Loader2,
  Mail,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Cake,
} from "lucide-react";
import { toast } from "sonner";

type ClientStatus = "pending" | "approved" | "paused" | null;

interface ClientProfile {
  user_id: string;
  name: string | null;
  phone?: string | null;
  email?: string | null;
  status: ClientStatus;
  birth_date?: string | null; // ISO date string from PostgREST
}

const formatBirthDateBR = (iso?: string | null) => {
  if (!iso) return null;
  // iso comes like "YYYY-MM-DD"
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

const ClientesPage = () => {
  const { salon } = useSalon();
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingUserId, setActingUserId] = useState<string | null>(null);

  const fetchClients = async () => {
    if (!salon) {
      setClients([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("salon_clients")
      .select("user_id, profiles(full_name, name, phone, email, status, birth_date)")
      .eq("salon_id", salon.id)
      .order("user_id", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar clientes: " + error.message);
      setClients([]);
      setLoading(false);
      return;
    }

    const mapped: ClientProfile[] = (data ?? []).map((row: any) => ({
      user_id: row.user_id,
      name: row.profiles?.full_name ?? row.profiles?.name ?? null,
      phone: row.profiles?.phone ?? null,
      email: row.profiles?.email ?? null,
      status: (row.profiles?.status ?? null) as ClientStatus,
      birth_date: row.profiles?.birth_date ?? null,
    }));

    setClients(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salon?.id]);

  const handleCopyInviteLink = () => {
    if (!salon?.client_link) {
      toast.error("Link de convite não encontrado. Configure nas Configurações.");
      return;
    }
    const url = `${window.location.origin}/convite/${salon.client_link}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Link de convite copiado! Compartilhe com sua cliente."))
      .catch(() => toast.error("Não foi possível copiar o link."));
  };

  const handleApprove = async (clientUserId: string) => {
    setActingUserId(clientUserId);
    const { data, error } = await supabase.rpc("approve_client", { _client_user_id: clientUserId });
    setActingUserId(null);

    if (error) toast.error("Erro ao aprovar cliente: " + error.message);
    else if (data === "forbidden") toast.error("Sem permissão para aprovar este cliente.");
    else if (data === "not_found") toast.error("Cliente não encontrado.");
    else {
      toast.success("Cliente aprovada com sucesso!");
      fetchClients();
    }
  };

  const handlePause = async (clientUserId: string) => {
    setActingUserId(clientUserId);
    const { data, error } = await supabase.rpc("pause_client", { _client_user_id: clientUserId });
    setActingUserId(null);

    if (error) toast.error("Erro ao pausar cliente: " + error.message);
    else if (data === "forbidden") toast.error("Sem permissão para pausar este cliente.");
    else if (data === "not_found") toast.error("Cliente não encontrado.");
    else {
      toast.success("Cliente pausada. Agendamentos futuros ficaram pendentes.");
      fetchClients();
    }
  };

  const handleReactivate = async (clientUserId: string) => {
    setActingUserId(clientUserId);
    const { data, error } = await supabase.rpc("reactivate_client", { _client_user_id: clientUserId });
    setActingUserId(null);

    if (error) toast.error("Erro ao reativar cliente: " + error.message);
    else if (data === "forbidden") toast.error("Sem permissão para reativar este cliente.");
    else if (data === "not_found") toast.error("Cliente não encontrado.");
    else {
      toast.success("Cliente reativada! Agendamentos permanecem pendentes para você confirmar na agenda.");
      fetchClients();
    }
  };

  const groups = useMemo(() => {
    const pending = clients.filter((c) => c.status === "pending" || c.status === null);
    const approved = clients.filter((c) => c.status === "approved");
    const paused = clients.filter((c) => c.status === "paused");
    return { pending, approved, paused };
  }, [clients]);

  const ClientRow = ({ c, right }: { c: ClientProfile; right?: React.ReactNode }) => (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{c.name || "Cliente sem nome"}</p>

        <div className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground">
          {c.email && (
            <span className="flex items-center gap-1 truncate">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{c.email}</span>
            </span>
          )}

          {c.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3 shrink-0" />
              {c.phone}
            </span>
          )}

          {c.birth_date && (
            <span className="flex items-center gap-1">
              <Cake className="h-3 w-3 shrink-0" />
              {formatBirthDateBR(c.birth_date)}
            </span>
          )}
        </div>
      </div>

      {right}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gerencie as clientes do seu salão</p>
        </div>
        <Button className="gap-2" onClick={handleCopyInviteLink}>
          <LinkIcon className="h-4 w-4" /> Convidar cliente
        </Button>
      </div>

      <Tabs defaultValue="approved" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pendentes ({groups.pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Aprovados ({groups.approved.length})</TabsTrigger>
          <TabsTrigger value="paused">Pausados ({groups.paused.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-[hsl(var(--salon-warning))]" />
                Pendentes de aprovação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {groups.pending.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma cliente pendente.</p>
              ) : (
                groups.pending.map((c) => (
                  <ClientRow
                    key={c.user_id}
                    c={c}
                    right={
                      <Button
                        size="sm"
                        className="gap-1"
                        disabled={actingUserId === c.user_id}
                        onClick={() => handleApprove(c.user_id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Aprovar
                      </Button>
                    }
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Clientes aprovadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {groups.approved.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma cliente aprovada.</p>
              ) : (
                groups.approved.map((c) => (
                  <ClientRow
                    key={c.user_id}
                    c={c}
                    right={
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={actingUserId === c.user_id}
                        onClick={() => handlePause(c.user_id)}
                      >
                        <PauseCircle className="h-4 w-4" />
                        Pausar
                      </Button>
                    }
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paused">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-muted-foreground" />
                Clientes pausadas (desligadas)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {groups.paused.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma cliente pausada.</p>
              ) : (
                groups.paused.map((c) => (
                  <ClientRow
                    key={c.user_id}
                    c={c}
                    right={
                      <Button
                        size="sm"
                        className="gap-1"
                        disabled={actingUserId === c.user_id}
                        onClick={() => handleReactivate(c.user_id)}
                      >
                        <PlayCircle className="h-4 w-4" />
                        Reativar
                      </Button>
                    }
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Total vinculadas ({clients.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Pendentes: {groups.pending.length} • Aprovadas: {groups.approved.length} • Pausadas: {groups.paused.length}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientesPage;
