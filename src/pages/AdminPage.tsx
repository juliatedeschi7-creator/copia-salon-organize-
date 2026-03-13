// AdminPage — aligned to the actual public.profiles schema:
// id, full_name, email, role, status, approved_at, created_at, updated_at
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle, XCircle, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Valid role values defined in the app
type ProfileRole = "admin" | "dono" | "funcionario" | "cliente";
// Valid status values used in the app
type ProfileStatus = "pending" | "approved";

// Matches the actual profiles table columns in the database
interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: ProfileRole | null;
  status: ProfileStatus | null;
  approved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const ROLE_LABELS: Record<ProfileRole, string> = {
  admin: "Admin",
  dono: "Dono",
  funcionario: "Funcionário",
  cliente: "Cliente",
};

const STATUS_LABELS: Record<ProfileStatus | string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
};

type ModalType = "edit" | null;

const AdminPage = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pendentes");

  // Edit modal state
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileRow | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    role: "" as ProfileRole | "",
  });
  const [saving, setSaving] = useState(false);

  // Fetch all profiles using only existing schema columns
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, status, approved_at, created_at, updated_at")
      .order("full_name");
    if (error) {
      toast({ title: "Erro ao carregar usuários", description: error.message, variant: "destructive" });
    } else {
      setProfiles((data ?? []) as ProfileRow[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const openEditModal = (profile: ProfileRow) => {
    setSelectedProfile(profile);
    setFormData({
      full_name: profile.full_name ?? "",
      role: profile.role ?? "",
    });
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setSelectedProfile(null);
  };

  // Approve: set status = 'approved' and approved_at = now()
  const handleApprove = async (profile: ProfileRow) => {
    const { error } = await supabase
      .from("profiles")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", profile.id);
    if (error) {
      toast({ title: "Erro ao aprovar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário aprovado com sucesso!" });
      fetchProfiles();
    }
  };

  // Revoke approval: set status = 'pending' and clear approved_at
  const handleRevokeApproval = async (profile: ProfileRow) => {
    const { error } = await supabase
      .from("profiles")
      .update({ status: "pending", approved_at: null })
      .eq("id", profile.id);
    if (error) {
      toast({ title: "Erro ao revogar aprovação", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Aprovação revogada." });
      fetchProfiles();
    }
  };

  // Edit: update full_name and role (email is managed by auth — not editable here)
  const handleSaveEdit = async () => {
    if (!selectedProfile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: formData.full_name, role: formData.role || null })
      .eq("id", selectedProfile.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao editar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário atualizado com sucesso!" });
      closeModal();
      fetchProfiles();
    }
  };

  // A profile is considered approved when status === 'approved'
  const isApproved = (p: ProfileRow) => p.status === "approved";

  const pendentes = profiles.filter((p) => !isApproved(p));
  const aprovados = profiles.filter((p) => isApproved(p));

  const statusBadgeVariant = (p: ProfileRow): "default" | "secondary" | "outline" =>
    isApproved(p) ? "default" : "secondary";

  const statusLabel = (p: ProfileRow) =>
    STATUS_LABELS[p.status ?? ""] ?? p.status ?? "Pendente";

  const renderRows = (rows: ProfileRow[]) => {
    if (loading) {
      return (
        <tr>
          <td colSpan={5} className="py-10 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          </td>
        </tr>
      );
    }
    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
            Nenhum usuário encontrado.
          </td>
        </tr>
      );
    }
    return rows.map((p) => (
      <tr key={p.id} className="border-b transition-colors hover:bg-muted/50">
        <td className="px-4 py-3 font-medium">{p.full_name || "—"}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{p.email || "—"}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{p.role ? (ROLE_LABELS[p.role] ?? p.role) : "—"}</td>
        <td className="px-4 py-3">
          <Badge variant={statusBadgeVariant(p)}>{statusLabel(p)}</Badge>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {!isApproved(p) ? (
              <Button size="sm" variant="default" onClick={() => handleApprove(p)} className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Aprovar
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => handleRevokeApproval(p)} className="gap-1 text-destructive hover:text-destructive">
                <XCircle className="h-3 w-3" />
                Revogar
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => openEditModal(p)} className="gap-1">
              <Pencil className="h-3 w-3" />
              Editar
            </Button>
          </div>
        </td>
      </tr>
    ));
  };

  const tableHeaders = (
    <thead>
      <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <th className="px-4 py-3">Nome</th>
        <th className="px-4 py-3">E-mail</th>
        <th className="px-4 py-3">Perfil</th>
        <th className="px-4 py-3">Status</th>
        <th className="px-4 py-3">Ações</th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administração</h1>
        <p className="text-sm text-muted-foreground">Gerencie usuários e acessos do sistema.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap gap-1 h-auto">
          <TabsTrigger value="pendentes">
            Pendentes
            {pendentes.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {pendentes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="aprovados">Aprovados</TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              {tableHeaders}
              <tbody>{renderRows(pendentes)}</tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="aprovados">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              {tableHeaders}
              <tbody>{renderRows(aprovados)}</tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: Editar usuário */}
      <Dialog open={modal === "edit"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário — {selectedProfile?.full_name || selectedProfile?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formData.full_name}
                onChange={(e) => setFormData((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-role">Perfil (role)</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData((f) => ({ ...f, role: v as ProfileRole }))}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue placeholder="Selecione um perfil" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as ProfileRole[]).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;