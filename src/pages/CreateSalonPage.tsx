import React, { useState } from "react";
import { useSalon } from "@/contexts/SalonContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Scissors, Loader2 } from "lucide-react";

const CreateSalonPage = () => {
  const { createSalon } = useSalon();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await createSalon(name.trim());
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Scissors className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl">Crie seu salão</CardTitle>
          <CardDescription>
            Configure seu espaço para começar a gerenciar agenda, clientes e finanças.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do salão</Label>
              <Input
                placeholder="Ex: Studio Beleza"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar salão
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateSalonPage;
