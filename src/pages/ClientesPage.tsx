import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/contexts/SalonContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Phone, Link as LinkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ClientProfile {
  user_id: string;
  name: string | null;
  phone?: string | null;
  email?: string | null;
}

const ClientesPage = () => {
  const { salon } = useSalon();
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    if (!salon) return;
    const { data, error } = await supabase
      .from("salon_members")
      .select("user_id, profiles(name, phone, email)")
      .eq("salon_id", salon.id)
      .eq("role", "cliente");

    if (error) {
      toast.error("Erro ao carregar clientes: " + error.message);
      setLoading(false);
      return;
    }

    const mapped: ClientProfile[] = (data ?? []).map((row: any) => ({
      user_id: row.user_id,
      name: row.profiles?.name ?? null,
      phone: row.profiles?.phone ?? null,
      email: row.profiles?.email ?? null,
    }));

    setClients(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, [salon]);

  const handleCopyInviteLink = () => {
    if (!salon?.client_link) {
      toast.error("Link de convite não encontrado. Configure nas Configurações.");
      return;
    }
    const url = `${window.location.origin}/convite/${salon.client_link}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link de convite copiado! Compartilhe com sua cliente.");
    }).catch(() => {
      toast.error("Não foi possível copiar o link.");
    });
  };

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Lista de Clientes ({clients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Nenhuma cliente vinculada ainda.</p>
              <p className="text-xs text-muted-foreground">
                Clique em <strong>Convidar cliente</strong> para copiar o link de cadastro e compartilhar com suas clientes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map((c) => (
                <div key={c.user_id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.name || c.email || c.user_id}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                      {c.email && !c.phone && <span>{c.email}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientesPage;
