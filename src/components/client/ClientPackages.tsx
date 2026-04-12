import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PackageItem {
  service_id: string;
  quantity_total: number;
  quantity_used: number;
  services: {
    name: string;
  };
}

interface ClientPackage {
  id: string;
  expires_at: string;
  created_at: string;
  packages: {
    name: string;
    description: string;
  };
  client_package_items: PackageItem[];
}

const ClientPackages = () => {
  const { user } = useAuth();

  const [activePackages, setActivePackages] = useState<ClientPackage[]>([]);
  const [oldPackages, setOldPackages] = useState<ClientPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPackages = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("client_packages")
      .select(`
        id,
        created_at,
        expires_at,
        packages(name, description),
        client_package_items(
          service_id,
          quantity_total,
          quantity_used,
          services(name)
        )
      `)
      .eq("client_user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const now = new Date();

    const active: ClientPackage[] = [];
    const old: ClientPackage[] = [];

    (data || []).forEach((pkg: any) => {
      const expired = new Date(pkg.expires_at) < now;
      const fullyUsed = pkg.client_package_items.every(
        (i: PackageItem) => i.quantity_used >= i.quantity_total
      );

      if (!expired && !fullyUsed) {
        active.push(pkg);
      } else {
        old.push(pkg);
      }
    });

    setActivePackages(active);
    setOldPackages(old);
    setLoading(false);
  };

  useEffect(() => {
    fetchPackages();
  }, [user]);

  const renderPackageCard = (pkg: ClientPackage, highlight = false) => {
    return (
      <div
        key={pkg.id}
        className={`min-w-[280px] max-w-[280px] rounded-xl p-4 transition ${
          highlight
            ? "bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30"
            : "bg-card border border-border"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">{pkg.packages.name}</h3>
          <Badge variant="outline">
            {new Date(pkg.expires_at) < new Date()
              ? "Expirado"
              : "Ativo"}
          </Badge>
        </div>

        {pkg.packages.description && (
          <p className="text-xs text-muted-foreground mb-3">
            {pkg.packages.description}
          </p>
        )}

        <div className="space-y-2">
          {pkg.client_package_items.map((item) => {
            const remaining = item.quantity_total - item.quantity_used;
            const percent =
              (item.quantity_used / item.quantity_total) * 100;

            return (
              <div key={item.service_id}>
                <div className="flex justify-between text-sm">
                  <span>{item.services.name}</span>
                  <span className="text-primary font-medium">
                    {remaining} restante(s)
                  </span>
                </div>

                {/* Barra estilo Netflix */}
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Expira em{" "}
          {format(new Date(pkg.expires_at), "dd/MM/yyyy", {
            locale: ptBR,
          })}
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (activePackages.length === 0 && oldPackages.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        Você ainda não possui pacotes.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🔥 ATIVOS */}
      {activePackages.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Seus pacotes ativos
          </h2>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {activePackages.map((pkg, i) =>
              renderPackageCard(pkg, i === 0) // destaque no primeiro
            )}
          </div>
        </div>
      )}

      {/* 📦 HISTÓRICO */}
      {oldPackages.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            Histórico de pacotes
          </h2>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {oldPackages.map((pkg) => renderPackageCard(pkg))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPackages;
