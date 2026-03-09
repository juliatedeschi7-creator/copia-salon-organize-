import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
}

interface RoleRow {
  user_id: string;
  role: string;
}

const AdminPage = () => {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [userRoles, setUserRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    setProfiles((profilesRes.data as ProfileRow[]) ?? []);
    setUserRoles((rolesRes.data as RoleRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      toast.error("Erro ao aprovar: " + error.message);
    } else {
      toast.success("Usuário aprovado!");
      fetchData();
    }
  };

  const handleReject = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        status: "pending",
        approved_at: null,
      })
      .eq("id", userId);

    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      toast.success("Acesso revogado.");
      fetchData();
    }
  };

  const handleSetRole = async (userId: string, role: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);

    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role });

    if (error) {
      toast.error("Erro ao definir perfil: " + error.message);
    } else {
      toast.success("Perfil atualizado!");
      fetchData();
    }
  };

  const getRoles = (userId: string) =>
    userRoles.filter((r) => r.user_id === userId).map((r) => r.role);

  const pending = profiles.filter((p) => p.status === "pending");
  const approved = profiles.filter((p) => p.status === "approved");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Painel Administrativo
        </h1>
        <p className="text-sm text-muted-foreground">
          Aprove usuários e gerencie perfis de acesso
        </p>
      </div>

      {/* Usuários aguardando */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5 text-yellow-500" />
            Aguardando aprovação ({pending.length})
          </CardTitle>
        </CardHeader>

        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma solicitação pendente
            </p>
          ) : (
            <div className="space-y-2">
              {pending.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {p.full_name || "Sem nome"}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleApprove(p.id)}
                    className="gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Aprovar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usuários aprovados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Usuários aprovados ({approved.length})
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-2">
            {approved.map((p) => {
              const roles = getRoles(p.id);
              const isAdmin = roles.includes("admin");

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {p.full_name || "Sem nome"}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin ? (
                      <Badge>Admin</Badge>
                    ) : (
                      <>
                        <Select
                          onValueChange={(v) => handleSetRole(p.id, v)}
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue placeholder="Perfil" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dono">Dono</SelectItem>
                            <SelectItem value="funcionario">Funcionário</SelectItem>
                            <SelectItem value="cliente">Cliente</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReject(p.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default AdminPage;
