import React, { useState, useEffect } from "react";
import { useSalon } from "@/contexts/SalonContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, Clock, Package } from "lucide-react";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  category: string;
  is_active: boolean;
}

interface ServicePackage {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  validity_days: number;
  package_items: Array<{
    service_id: string;
    quantity: number;
    services: { name: string };
  }>;
}

const ServicesShowcasePage = () => {
  const { salon } = useSalon();
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!salon) return;

    const fetchData = async () => {
      const [servicesRes, packagesRes] = await Promise.all([
        supabase
          .from("services")
          .select("*")
          .eq("salon_id", salon.id)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("packages")
          .select("id, name, description, price, validity_days, is_active, package_items(service_id, quantity, services(name))")
          .eq("salon_id", salon.id)
          .eq("is_active", true)
          .order("name"),
      ]);

      if (servicesRes.error) {
        toast.error("Erro ao carregar serviços: " + servicesRes.error.message);
      } else {
        setServices(servicesRes.data || []);
      }

      if (packagesRes.error) {
        toast.error("Erro ao carregar pacotes: " + packagesRes.error.message);
      } else {
        setPackages(packagesRes.data || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [salon]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Conheça os Serviços</h1>
        <p className="text-muted-foreground mt-2">Explore todos os serviços e pacotes disponíveis</p>
      </div>

      {services.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Serviços</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card key={service.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <CardDescription>{service.category}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-3">
                    {service.description && (
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <DollarSign className="h-4 w-4" />
                        R$ {service.price.toFixed(2)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {service.duration} min
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {packages.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Pacotes</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {packages.map((pkg) => (
              <Card key={pkg.id} className="flex flex-col border-2 border-primary/20">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      {pkg.description && <CardDescription>{pkg.description}</CardDescription>}
                    </div>
                    <Badge variant="outline">Pacote</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">Serviços inclusos:</p>
                      <ul className="space-y-1">
                        {pkg.package_items.map((item, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                            <Package className="h-3 w-3" />
                            {item.services.name} (x{item.quantity})
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div>
                        {pkg.price && (
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <DollarSign className="h-4 w-4" />
                            R$ {pkg.price.toFixed(2)}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Válido por {pkg.validity_days} dias</p>
                      </div>
                      <Button size="sm">Agendar</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {services.length === 0 && packages.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Nenhum serviço disponível no momento
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ServicesShowcasePage;
