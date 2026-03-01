import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const EstoquePage = () => {
  const mockProducts = [
    { name: "Esmalte Rosa", category: "Manicure", qty: 12, min: 5, unit: "un" },
    { name: "Shampoo Profissional", category: "Cabelo", qty: 3, min: 5, unit: "un" },
    { name: "Creme Hidratante", category: "Estética", qty: 8, min: 3, unit: "un" },
    { name: "Acetona", category: "Manicure", qty: 2, min: 4, unit: "ml" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Estoque</h1>
        <p className="text-sm text-muted-foreground">Controle de produtos e insumos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            Produtos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockProducts.map((p) => (
              <div key={p.name} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{p.qty} {p.unit}</span>
                  {p.qty <= p.min && (
                    <Badge variant="outline" className="gap-1 border-destructive/30 bg-destructive/10 text-destructive">
                      <AlertTriangle className="h-3 w-3" /> Baixo
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EstoquePage;
