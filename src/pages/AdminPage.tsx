import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Trash2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ProfileRole = "admin" | "dono" | "funcionario" | "cliente";
type ProfileStatus = "pending" | "approved" | "rejected";

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: ProfileRole | null;
  status: ProfileStatus | null;
  deleted_at: string | null;
}

const AdminPage = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pendentes");

  const fetchProfiles = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setProfiles(data || []);
    }

    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // ✅ APROVAR
  const approve = async (id: string) => {
    await supabase
      .from("profiles")
      .update({ status: "approved" })
      .eq("id", id);

    toast({ title: "Aprovado" });
    fetchProfiles();
  };

  // ❌ REJEITAR
  const reject = async (id: string) => {
    await supabase
      .from("profiles")
      .update({ status: "rejected" })
      .eq("id", id);

    toast({ title: "Rejeitado" });
    fetchProfiles();
  };

  // 🔁 REVOGAR
  const revoke = async (id: string) => {
    await supabase
      .from("profiles")
      .update({ status: "pending" })
      .eq("id", id);

    toast({ title: "Voltou para pendente" });
    fetchProfiles();
  };

  // 🗑️ EXCLUIR
  const remove = async (id: string) => {
    await supabase
      .from("profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    toast({ title: "Excluído" });
    fetchProfiles();
  };

  // ♻️ RESTAURAR
  const restore = async (id: string) => {
    await supabase
      .from("profiles")
      .update({ deleted_at: null })
      .eq("id", id);

    toast({ title: "Restaurado" });
    fetchProfiles();
  };

  const pendentes = profiles.filter(p => p.status === "pending" && !p.deleted_at);
  const aprovados = profiles.filter(p => p.status === "approved" && !p.deleted_at);
  const rejeitados = profiles.filter(p => p.status === "rejected" && !p.deleted_at);
  const excluidos = profiles.filter(p => p.deleted_at);

  const render = (list: ProfileRow[], isDeleted = false) => {
    if (loading) {
      return <Loader2 className="mx-auto animate-spin mt-10" />;
    }

    if (list.length === 0) {
      return <p className="text-center text-muted-foreground mt-10">Nenhum usuário</p>;
    }

    return list.map((p) => (
      <div key={p.id} className="flex justify-between items-center border p-4 rounded-lg">
        <div>
          <p className="font-medium">{p.full_name}</p>
          <p className="text-sm text-muted-foreground">{p.email}</p>
          <Badge>{p.status}</Badge>
        </div>

        <div className="flex gap-2 flex-wrap">
          {isDeleted ? (
            <Button size="sm" onClick={() => restore(p.id)}>
              <RotateCcw className="w-4 h-4 mr-1" /> Restaurar
            </Button>
          ) : (
            <>
              {p.status === "pending" && (
                <>
                  <Button size="sm" onClick={() => approve(p.id)}>
                    <CheckCircle className="w-4 h-4 mr-1" /> Aprovar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => reject(p.id)}>
                    <XCircle className="w-4 h-4 mr-1" /> Rejeitar
                  </Button>
                </>
              )}

              {p.status === "approved" && (
                <Button size="sm" variant="outline" onClick={() => revoke(p.id)}>
                  Revogar
                </Button>
              )}

              <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Administração</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
          <TabsTrigger value="aprovados">Aprovados ({aprovados.length})</TabsTrigger>
          <TabsTrigger value="rejeitados">Rejeitados ({rejeitados.length})</TabsTrigger>
          <TabsTrigger value="excluidos">Excluídos ({excluidos.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes">{render(pendentes)}</TabsContent>
        <TabsContent value="aprovados">{render(aprovados)}</TabsContent>
        <TabsContent value="rejeitados">{render(rejeitados)}</TabsContent>
        <TabsContent value="excluidos">{render(excluidos, true)}</TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
