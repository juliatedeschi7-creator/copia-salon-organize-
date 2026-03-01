import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Package, Clock } from "lucide-react";

const EmployeePage = () => {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Minha Agenda
        </h1>
        <p className="text-sm text-muted-foreground">
          Seus agendamentos e comissões, {profile?.name?.split(" ")[0]}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">5</p>
              <p className="text-xs text-muted-foreground">Atendimentos hoje</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <Package className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">R$ 380</p>
              <p className="text-xs text-muted-foreground">Comissão do mês</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Meus agendamentos de hoje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { time: "09:00", client: "Ana Souza", service: "Corte" },
              { time: "10:30", client: "Carla Lima", service: "Escova" },
              { time: "14:00", client: "Julia Santos", service: "Coloração" },
            ].map((a) => (
              <div key={a.time} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold">{a.time}</span>
                <div>
                  <p className="text-sm font-medium">{a.client}</p>
                  <p className="text-xs text-muted-foreground">{a.service}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeePage;
