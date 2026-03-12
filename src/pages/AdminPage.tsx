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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, Clock, ShieldOff, ShieldCheck, Pencil, Trash2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProfileRow {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  is_approved: boolean;
  approved_at: string | null;
  access_state: "active" | "notice" | "blocked";
  access_message: string;
  notice_until: string | null;
  deleted_at: string | null;
}

type ModalType = "notice" | "block" | "edit" | null;

const AdminPage = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pendentes");

  // Modal state
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileRow | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    access_message: "",
    notice_until: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, name, email, phone, is_approved, approved_at, access_state, access_message, notice_until, deleted_at")
      .order("name");
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

  const openModal = (type: ModalType, profile: ProfileRow) => {
    setSelectedProfile(profile);
    setFormData({
      name: profile.name ?? "",
      phone: profile.phone ?? "",
      access_message: profile.access_message ?? "",
      notice_until: profile.notice_until
        ? format(parseISO(profile.notice_until), "yyyy-MM-dd'T'HH:mm")
        : "",
    });
    setModal(type);
  };

  const closeModal = () => {
    setModal(null);
    setSelectedProfile(null);
  };

  const handleApprove = async (profile: ProfileRow) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: true, approved_at: new Date().toISOString() })
      .eq("id", profile.id);
    if (error) {
      toast({ title: "Erro ao aprovar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário aprovado com sucesso!" });
      fetchProfiles();
    }
  };

  const handleActivate = async (profile: ProfileRow) => {
    const { error } = await supabase
      .from("profiles")
      .update({ access_state: "active", access_message: "", notice_until: null })
      .eq("id", profile.id);
    if (error) {
      toast({ title: "Erro ao ativar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário ativado com sucesso!" });
      fetchProfiles();
    }
  };

  const handleSoftDelete = async (profile: ProfileRow) => {
    const { error } = await supabase
      .from("profiles")
      .update({ deleted_at: new Date().toISOString(), access_state: "blocked" })
      .eq("id", profile.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário excluído (soft delete)." });
      fetchProfiles();
    }
  };

  const handleRestore = async (profile: ProfileRow) => {
    const { error } = await supabase
      .from("profiles")
      .update({ deleted_at: null, access_state: "active", access_message: "", notice_until: null })
      .eq("id", profile.id);
    if (error) {
      toast({ title: "Erro ao restaurar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário restaurado com sucesso!" });
      fetchProfiles();
    }
  };

  const handleSaveNotice = async () => {
    if (!selectedProfile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        access_state: "notice",
        access_message: formData.access_message,
        notice_until: formData.notice_until ? new Date(formData.notice_until).toISOString() : null,
      })
      .eq("id", selectedProfile.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao definir carência", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Carência definida com sucesso!" });
      closeModal();
      fetchProfiles();
    }
  };

  const handleSaveBlock = async () => {
    if (!selectedProfile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        access_state: "blocked",
        access_message: formData.access_message,
        notice_until: null,
      })
      .eq("id", selectedProfile.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao bloquear", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário bloqueado com sucesso!" });
      closeModal();
      fetchProfiles();
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedProfile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name: formData.name, phone: formData.phone })
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

  const pendentes = profiles.filter((p) => !p.is_approved && !p.deleted_at);
  const aprovados = profiles.filter((p) => p.is_approved && !p.deleted_at);
  const emCarencia = profiles.filter((p) => p.access_state === "notice" && !p.deleted_at);
  const bloqueados = profiles.filter((p) => p.access_state === "blocked" && !p.deleted_at);
  const excluidos = profiles.filter((p) => !!p.deleted_at);

  const stateLabel: Record<string, string> = {
    active: "Ativo",
    notice: "Carência",
    blocked: "Bloqueado",
  };

  const stateBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    notice: "secondary",
    blocked: "destructive",
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return iso;
    }
  };

  const renderRows = (rows: ProfileRow[], showRestore = false) => {
    if (loading) {
      return (
        <tr>
          <td colSpan={6} className="py-10 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          </td>
        </tr>
      );
    }
    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
            Nenhum usuário encontrado.
          </td>
        </tr>
      );
    }
    return rows.map((p) => (
      <tr key={p.id} className="border-b transition-colors hover:bg-muted/50">
        <td className="px-4 py-3 font-medium">{p.name || "—"}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{p.email}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{p.phone || "—"}</td>
        <td className="px-4 py-3">
          {p.deleted_at ? (
            <Badge variant="outline">Excluído</Badge>
          ) : (
            <Badge variant={stateBadgeVariant[p.access_state] ?? "outline"}>
              {stateLabel[p.access_state] ?? p.access_state}
            </Badge>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {p.notice_until ? formatDate(p.notice_until) : "—"}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {showRestore ? (
              <Button size="sm" variant="outline" onClick={() => handleRestore(p)} className="gap-1">
                <RotateCcw className="h-3 w-3" />
                Restaurar
              </Button>
            ) : (
              <>
                {!p.is_approved && (
                  <Button size="sm" variant="default" onClick={() => handleApprove(p)} className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Aprovar
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => openModal("notice", p)} className="gap-1">
                  <Clock className="h-3 w-3" />
                  Carência
                </Button>
                <Button size="sm" variant="outline" onClick={() => openModal("block", p)} className="gap-1 text-destructive hover:text-destructive">
                  <ShieldOff className="h-3 w-3" />
                  Bloquear
                </Button>
                {(p.access_state === "notice" || p.access_state === "blocked") && (
                  <Button size="sm" variant="outline" onClick={() => handleActivate(p)} className="gap-1 text-green-600 hover:text-green-700">
                    <ShieldCheck className="h-3 w-3" />
                    Ativar
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => openModal("edit", p)} className="gap-1">
                  <Pencil className="h-3 w-3" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSoftDelete(p)}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                  Excluir
                </Button>
              </>
            )}
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
        <th className="px-4 py-3">Telefone</th>
        <th className="px-4 py-3">Estado</th>
        <th className="px-4 py-3">Carência até</th>
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
          <TabsTrigger value="carencia">Em carência</TabsTrigger>
          <TabsTrigger value="bloqueados">Bloqueados</TabsTrigger>
          <TabsTrigger value="excluidos">Excluídos</TabsTrigger>
        </TabsList>

        {[
          { value: "pendentes", rows: pendentes },
          { value: "aprovados", rows: aprovados },
          { value: "carencia", rows: emCarencia },
          { value: "bloqueados", rows: bloqueados },
        ].map(({ value, rows }) => (
          <TabsContent key={value} value={value}>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                {tableHeaders}
                <tbody>{renderRows(rows)}</tbody>
              </table>
            </div>
          </TabsContent>
        ))}

        <TabsContent value="excluidos">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              {tableHeaders}
              <tbody>{renderRows(excluidos, true)}</tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: Definir Carência */}
      <Dialog open={modal === "notice"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Carência — {selectedProfile?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="notice-message">Mensagem para o usuário</Label>
              <Textarea
                id="notice-message"
                placeholder="Ex: Sua mensalidade está vencida. Pague em 5 dias úteis ou ficará sem o sistema."
                value={formData.access_message}
                onChange={(e) => setFormData((f) => ({ ...f, access_message: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notice-until">Carência até (data e hora)</Label>
              <Input
                id="notice-until"
                type="datetime-local"
                value={formData.notice_until}
                onChange={(e) => setFormData((f) => ({ ...f, notice_until: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Após esse prazo, o usuário será automaticamente bloqueado.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSaveNotice} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Bloquear */}
      <Dialog open={modal === "block"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear usuário — {selectedProfile?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="block-message">Mensagem para o usuário (opcional)</Label>
              <Textarea
                id="block-message"
                placeholder="Ex: Seu acesso foi suspenso por falta de pagamento."
                value={formData.access_message}
                onChange={(e) => setFormData((f) => ({ ...f, access_message: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button variant="destructive" onClick={handleSaveBlock} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar */}
      <Dialog open={modal === "edit"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário — {selectedProfile?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
              />
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