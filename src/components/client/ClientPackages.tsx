import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSalon } from "@/contexts/SalonContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, CalendarClock, ListChecks, Loader2, History } from "lucide-react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ServiceRow {
  name: string;
}

interface ClientPackageItemRow {
  id: string;
  service_id: string;
  quantity_total: number;
  quantity_used: number;
  services: ServiceRow | null;
}

interface PackageRow {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  validity_days: number;
  rules: string | null;
}

interface ClientPackageRow {
  id: string;
  package_id: string;
  purchased_at: string;
  expires_at: string;
  status: string;
  client_package_items: ClientPackageItemRow[];
}

const statusMap: Record<string, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-green-500/15 text-green-700 border-green-500/30" },
  concluido: { label: "Concluído", className: "bg-primary/15 text-primary border-primary/30" },
  finalizado: { label: "Finalizado", className: "bg-primary/15 text-primary border-primary/30" },
  expirado: { label: "Expirado", className: "bg-muted text-muted-foreground border-border" },
  cancelado: { label: "Cancelado", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const PackageCard = ({ cp, pkg }: { cp: ClientPackageRow; pkg: PackageRow }) => {
  const expired = isPast(new Date(cp.expires_at));
  const effectiveStatus = expired && cp.status === "ativo" ? "expirado" : cp.status;
  const st = statusMap[effectiveStatus] || statusMap.ativo;
  const items = cp.client_package_items ?? [];

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-foreground">{pkg.name}</p>
          {pkg.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{pkg.description}</p>
          )}
        </div>
        <Badge variant="outline" className={st.className}>
          {st.label}
        </Badge>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => {
            const pct = item.quantity_total > 0 ? (item.quantity_used / item.quantity_total) * 100 : 0;
            return (
              <div key={item.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.services?.name ?? "Serviço desconhecido"}</span>
                  <span>{item.quantity_used}/{item.quantity_total}</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5" />
          Comprado em {format(new Date(cp.purchased_at), "dd/MM/yyyy", { locale: ptBR })}
        </span>
        <span className="flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5" />
          Válido até {format(new Date(cp.expires_at), "dd/MM/yyyy", { locale: ptBR })}
        </span>
        {pkg.price != null && pkg.price > 0 && <span>R$ {Number(pkg.price).toFixed(2)}</span>}
      </div>

      {pkg.rules && pkg.rules.trim() !== "" && (
        <div className="rounded-md bg-muted/50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1">
            <ListChecks className="h-3.5 w-3.5" /> Regras do pacote
          </p>
          <p className="text-xs text-muted-foreground whitespace-pre-line">{pkg.rules}</p>
        </div>
      )}
    </div>
  );
};

const ClientPackages = () => {
  const { user } = useAuth();
  const { salon } = useSalon();
  const [clientPackages, setClientPackages] = useState<ClientPackageRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackages = async () => {
      if (!user || !salon) return;
      const [cpRes, pRes] = await Promise.all([
        supabase
          .from("client_packages")
          .select("id, package_id, purchased_at, expires_at, status, client_package_items(id, service_id, quantity_total, quantity_used, services(name))")
          .eq("client_user_id", user.id)
          .eq("salon_id", salon.id)
          .order("purchased_at", { ascending: false }),
        supabase
          .from("packages")
          .select("id, name, description, price, validity_days, rules")
          .eq("salon_id", salon.id),
      ]);
      setClientPackages((cpRes.data ?? []) as unknown as ClientPackageRow[]);
      setPackages((pRes.data ?? []) as PackageRow[]);
      setLoading(false);
    };
    fetchPackages();
  }, [user, salon]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const packageMap = Object.fromEntries(packages.map((p) => [p.id, p]));

  const activePackages = clientPackages.filter((cp) => {
    const pkg = packageMap[cp.package_id];
    if (!pkg) return false;
    const expired = isPast(new Date(cp.expires_at));
    const effectiveStatus = expired && cp.status === "ativo" ? "expirado" : cp.status;
    return effectiveStatus === "ativo";
  });

  const historyPackages = clientPackages.filter((cp) => {
    const pkg = packageMap[cp.package_id];
    if (!pkg) return false;
    const expired = isPast(new Date(cp.expires_at));
    const effectiveStatus = expired && cp.status === "ativo" ? "expirado" : cp.status;
    return effectiveStatus !== "ativo";
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5 text-primary" /> Meus Pacotes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {clientPackages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Você ainda não possui pacotes
          </p>
        ) : (
          <Tabs defaultValue="ativos">
            <TabsList className="mb-4">
              <TabsTrigger value="ativos" className="gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Ativos {activePackages.length > 0 && `(${activePackages.length})`}
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-1.5">
                <History className="h-3.5 w-3.5" />
                Histórico {historyPackages.length > 0 && `(${historyPackages.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ativos" className="space-y-4">
              {activePackages.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pacote ativo no momento</p>
              ) : (
                activePackages.map((cp) => {
                  const pkg = packageMap[cp.package_id];
                  if (!pkg) return null;
                  return <PackageCard key={cp.id} cp={cp} pkg={pkg} />;
                })
              )}
            </TabsContent>

            <TabsContent value="historico" className="space-y-4">
              {historyPackages.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pacote anterior</p>
              ) : (
                historyPackages.map((cp) => {
                  const pkg = packageMap[cp.package_id];
                  if (!pkg) return null;
                  return <PackageCard key={cp.id} cp={cp} pkg={pkg} />;
                })
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientPackages;
