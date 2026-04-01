import React, { useState, useEffect } from "react";
import { useSalon } from "@/contexts/SalonContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Scissors, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const CreateSalonPage = () => {
  const { salon, isLoading, createSalon, refetch } = useSalon();
  const { isAuthenticated } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // Redireciona quem já tem salão ou não está autenticado
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        window.location.href = "/login"; // vai para login se não estiver logado
      } else if (salon) {
        window.location.href = "/dashboard"; // já tem salão → dashboard
      }
    }
  }, [isLoading, salon, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createSalon(name.trim());
      await refetch();
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar salão");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || salon) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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