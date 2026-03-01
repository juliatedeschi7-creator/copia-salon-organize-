import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/contexts/SalonContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ClipboardList, Plus, Trash2, Edit2, ChevronDown, ChevronUp,
  Loader2, GripVertical, Save, X, Users
} from "lucide-react";
import { toast } from "sonner";

interface AnamnesisQuestion {
  id: string;
  text: string;
  question_type: "text" | "boolean" | "select";
  options: string[];
  position: number;
  is_required: boolean;
}

interface AnamnesisForm {
  id: string;
  title: string;
  service_type: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

interface AnamnesisResponse {
  id: string;
  answered_at: string;
  answers: Record<string, any>;
}

const SERVICE_TYPES = [
  { value: "geral", label: "Geral" },
  { value: "manicure", label: "Manicure / Pedicure" },
  { value: "cabelo", label: "Cabelo" },
  { value: "estetica", label: "Estética / Maquiagem" },
  { value: "depilacao", label: "Depilação" },
  { value: "massagem", label: "Massagem" },
];

const QUESTION_TYPES = [
  { value: "text", label: "Texto livre" },
  { value: "boolean", label: "Sim / Não" },
  { value: "select", label: "Múltipla escolha" },
];

const AnamnesesPage = () => {
  const { salon } = useSalon();
  const [forms, setForms] = useState<AnamnesisForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedForm, setExpandedForm] = useState<string | null>(null);
  const [formQuestions, setFormQuestions] = useState<Record<string, AnamnesisQuestion[]>>({});
  const [formResponses, setFormResponses] = useState<Record<string, AnamnesisResponse[]>>({});

  // Create/edit form dialog
  const [formDialog, setFormDialog] = useState(false);
  const [editingForm, setEditingForm] = useState<Partial<AnamnesisForm> | null>(null);
  const [savingForm, setSavingForm] = useState(false);

  // Question editing
  const [editingQuestions, setEditingQuestions] = useState<Record<string, AnamnesisQuestion[]>>({});
  const [newQuestionForms, setNewQuestionForms] = useState<Record<string, { text: string; question_type: string; options: string; is_required: boolean }>>({});

  const fetchForms = async () => {
    if (!salon) return;
    const { data } = await supabase
      .from("anamnesis_forms")
      .select("*")
      .eq("salon_id", salon.id)
      .order("created_at", { ascending: false });
    setForms((data || []) as AnamnesisForm[]);
    setLoading(false);
  };

  useEffect(() => { fetchForms(); }, [salon]);

  const fetchFormData = async (formId: string) => {
    const [qRes, rRes] = await Promise.all([
      supabase.from("anamnesis_questions").select("*").eq("form_id", formId).order("position"),
      supabase.from("anamnesis_responses").select("id, answered_at, answers").eq("form_id", formId).order("answered_at", { ascending: false }),
    ]);
    const questions = ((qRes.data || []) as any[]).map((q) => ({
      ...q,
      options: Array.isArray(q.options) ? q.options : [],
    })) as AnamnesisQuestion[];
    setFormQuestions((prev) => ({ ...prev, [formId]: questions }));
    setEditingQuestions((prev) => ({ ...prev, [formId]: questions }));
    setFormResponses((prev) => ({ ...prev, [formId]: (rRes.data || []) as AnamnesisResponse[] }));
  };

  const toggleExpand = (formId: string) => {
    if (expandedForm === formId) {
      setExpandedForm(null);
    } else {
      setExpandedForm(formId);
      if (!formQuestions[formId]) fetchFormData(formId);
    }
  };

  const openCreateForm = () => {
    setEditingForm({ title: "", service_type: "geral", description: "", is_active: true });
    setFormDialog(true);
  };

  const openEditForm = (form: AnamnesisForm) => {
    setEditingForm({ ...form });
    setFormDialog(true);
  };

  const handleSaveForm = async () => {
    if (!salon || !editingForm?.title?.trim()) return;
    setSavingForm(true);
    if (editingForm.id) {
      const { error } = await supabase.from("anamnesis_forms").update({
        title: editingForm.title,
        service_type: editingForm.service_type,
        description: editingForm.description,
        is_active: editingForm.is_active,
      }).eq("id", editingForm.id);
      if (error) { toast.error(error.message); } else {
        toast.success("Ficha atualizada!");
        fetchForms();
        setFormDialog(false);
      }
    } else {
      const { error } = await supabase.from("anamnesis_forms").insert({
        salon_id: salon.id,
        title: editingForm.title!,
        service_type: editingForm.service_type || "geral",
        description: editingForm.description || "",
        is_active: true,
      });
      if (error) { toast.error(error.message); } else {
        toast.success("Ficha criada!");
        fetchForms();
        setFormDialog(false);
      }
    }
    setSavingForm(false);
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm("Excluir esta ficha e todas as respostas?")) return;
    const { error } = await supabase.from("anamnesis_forms").delete().eq("id", formId);
    if (error) { toast.error(error.message); } else {
      toast.success("Ficha removida.");
      fetchForms();
      if (expandedForm === formId) setExpandedForm(null);
    }
  };

  const handleAddQuestion = async (formId: string) => {
    if (!salon) return;
    const nq = newQuestionForms[formId];
    if (!nq?.text?.trim()) return;
    const questions = editingQuestions[formId] || [];
    const options = nq.question_type === "select"
      ? nq.options.split("\n").map((o) => o.trim()).filter(Boolean)
      : [];
    const { error } = await supabase.from("anamnesis_questions").insert({
      form_id: formId,
      salon_id: salon.id,
      text: nq.text.trim(),
      question_type: nq.question_type || "text",
      options,
      position: questions.length,
      is_required: nq.is_required || false,
    });
    if (error) { toast.error(error.message); } else {
      toast.success("Pergunta adicionada!");
      setNewQuestionForms((prev) => ({ ...prev, [formId]: { text: "", question_type: "text", options: "", is_required: false } }));
      fetchFormData(formId);
    }
  };

  const handleDeleteQuestion = async (questionId: string, formId: string) => {
    const { error } = await supabase.from("anamnesis_questions").delete().eq("id", questionId);
    if (error) { toast.error(error.message); } else {
      fetchFormData(formId);
    }
  };

  const handleToggleForm = async (formId: string, value: boolean) => {
    await supabase.from("anamnesis_forms").update({ is_active: value }).eq("id", formId);
    setForms((prev) => prev.map((f) => f.id === formId ? { ...f, is_active: value } : f));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Anamnese</h1>
          <p className="text-sm text-muted-foreground">Crie e gerencie fichas personalizadas para suas clientes</p>
        </div>
        <Button onClick={openCreateForm} className="gap-2">
          <Plus className="h-4 w-4" /> Nova ficha
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center gap-3">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Nenhuma ficha criada ainda</p>
            <p className="text-xs text-muted-foreground">Crie fichas de anamnese para suas clientes responderem antes do atendimento</p>
            <Button onClick={openCreateForm} variant="outline" className="gap-2 mt-2">
              <Plus className="h-4 w-4" /> Criar primeira ficha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {forms.map((form) => (
            <Card key={form.id} className="overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition"
                onClick={() => toggleExpand(form.id)}
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">{form.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {SERVICE_TYPES.find((s) => s.value === form.service_type)?.label || form.service_type}
                      </Badge>
                      {!form.is_active && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Inativa</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => handleToggleForm(form.id, v)}
                  />
                  <Button size="icon" variant="ghost" onClick={() => openEditForm(form)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteForm(form.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {expandedForm === form.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {expandedForm === form.id && (
                <div className="border-t border-border">
                  {/* Stats */}
                  <div className="flex items-center gap-6 px-4 py-3 bg-muted/20">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <ClipboardList className="h-4 w-4" />
                      <span>{(formQuestions[form.id] || []).length} pergunta(s)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{(formResponses[form.id] || []).length} resposta(s)</span>
                    </div>
                  </div>

                  {/* Questions list */}
                  <div className="p-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground">Perguntas</p>
                    {(editingQuestions[form.id] || []).length === 0 && (
                      <p className="text-xs text-muted-foreground">Nenhuma pergunta ainda. Adicione abaixo.</p>
                    )}
                    {(editingQuestions[form.id] || []).map((q, idx) => (
                      <div key={q.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{idx + 1}. {q.text}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {QUESTION_TYPES.find((t) => t.value === q.question_type)?.label}
                            </Badge>
                            {q.is_required && <Badge variant="outline" className="text-xs text-destructive border-destructive/30">Obrigatória</Badge>}
                          </div>
                          {q.question_type === "select" && q.options.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">Opções: {q.options.join(", ")}</p>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => handleDeleteQuestion(q.id, form.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}

                    {/* Add question */}
                    <div className="rounded-lg border border-dashed border-border p-4 space-y-3 bg-muted/10">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Adicionar pergunta</p>
                      <div className="space-y-2">
                        <Input
                          placeholder="Texto da pergunta"
                          value={newQuestionForms[form.id]?.text || ""}
                          onChange={(e) => setNewQuestionForms((prev) => ({
                            ...prev,
                            [form.id]: { ...prev[form.id], text: e.target.value }
                          }))}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Tipo de resposta</Label>
                          <Select
                            value={newQuestionForms[form.id]?.question_type || "text"}
                            onValueChange={(v) => setNewQuestionForms((prev) => ({
                              ...prev,
                              [form.id]: { ...prev[form.id], question_type: v }
                            }))}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {QUESTION_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                          <Switch
                            checked={newQuestionForms[form.id]?.is_required || false}
                            onCheckedChange={(v) => setNewQuestionForms((prev) => ({
                              ...prev,
                              [form.id]: { ...prev[form.id], is_required: v }
                            }))}
                          />
                          <Label className="text-xs">Obrigatória</Label>
                        </div>
                      </div>
                      {newQuestionForms[form.id]?.question_type === "select" && (
                        <div className="space-y-1">
                          <Label className="text-xs">Opções (uma por linha)</Label>
                          <Textarea
                            placeholder={"Opção 1\nOpção 2\nOpção 3"}
                            rows={3}
                            value={newQuestionForms[form.id]?.options || ""}
                            onChange={(e) => setNewQuestionForms((prev) => ({
                              ...prev,
                              [form.id]: { ...prev[form.id], options: e.target.value }
                            }))}
                          />
                        </div>
                      )}
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => handleAddQuestion(form.id)}
                        disabled={!newQuestionForms[form.id]?.text?.trim()}
                      >
                        <Plus className="h-4 w-4" /> Adicionar pergunta
                      </Button>
                    </div>

                    {/* Responses preview */}
                    {(formResponses[form.id] || []).length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-foreground mb-2">Respostas recentes</p>
                        <div className="space-y-2">
                          {(formResponses[form.id] || []).slice(0, 3).map((r) => (
                            <div key={r.id} className="rounded-lg border border-border p-3 bg-muted/10">
                              <p className="text-xs text-muted-foreground">
                                Respondida em {new Date(r.answered_at).toLocaleDateString("pt-BR")}
                              </p>
                              <div className="mt-2 space-y-1">
                                {(editingQuestions[form.id] || []).slice(0, 3).map((q) => (
                                  <p key={q.id} className="text-xs">
                                    <span className="font-medium">{q.text}:</span>{" "}
                                    <span className="text-muted-foreground">
                                      {String(r.answers[q.id] ?? "—")}
                                    </span>
                                  </p>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Form Dialog */}
      <Dialog open={formDialog} onOpenChange={setFormDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingForm?.id ? "Editar ficha" : "Nova ficha de anamnese"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Título da ficha *</Label>
              <Input
                placeholder="Ex: Ficha de anamnese - Manicure"
                value={editingForm?.title || ""}
                onChange={(e) => setEditingForm((f) => ({ ...f, title: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de serviço</Label>
              <Select
                value={editingForm?.service_type || "geral"}
                onValueChange={(v) => setEditingForm((f) => ({ ...f, service_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                placeholder="Ex: Preencha antes da sua primeira consulta de manicure"
                rows={2}
                value={editingForm?.description || ""}
                onChange={(e) => setEditingForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <Button onClick={handleSaveForm} disabled={savingForm || !editingForm?.title?.trim()} className="w-full">
              {savingForm && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingForm?.id ? "Salvar alterações" : "Criar ficha"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnamnesesPage;
