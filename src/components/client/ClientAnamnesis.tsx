import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSalon } from "@/contexts/SalonContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ClipboardList, ShieldCheck, CheckCircle2, Loader2, ChevronRight, Lock
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
}

interface AnamnesisResponse {
  id: string;
  form_id: string;
  answered_at: string;
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  geral: "Geral",
  manicure: "Manicure / Pedicure",
  cabelo: "Cabelo",
  estetica: "Estética / Maquiagem",
  depilacao: "Depilação",
  massagem: "Massagem",
};

interface ClientAnamnesisProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ClientAnamnesis = ({ open, onOpenChange }: ClientAnamnesisProps) => {
  const { user } = useAuth();
  const { salon } = useSalon();
  const [forms, setForms] = useState<AnamnesisForm[]>([]);
  const [existingResponses, setExistingResponses] = useState<AnamnesisResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<AnamnesisForm | null>(null);
  const [questions, setQuestions] = useState<AnamnesisQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const fetchData = async () => {
    if (!salon || !user) return;
    const [fRes, rRes] = await Promise.all([
      supabase.from("anamnesis_forms").select("*").eq("salon_id", salon.id).eq("is_active", true),
      supabase.from("anamnesis_responses").select("id, form_id, answered_at").eq("client_user_id", user.id),
    ]);
    setForms((fRes.data || []) as AnamnesisForm[]);
    setExistingResponses((rRes.data || []) as AnamnesisResponse[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open) { setLoading(true); fetchData(); setSelectedForm(null); setDone(false); }
  }, [open, salon, user]);

  const openForm = async (form: AnamnesisForm) => {
    const { data } = await supabase
      .from("anamnesis_questions")
      .select("*")
      .eq("form_id", form.id)
      .order("position");
    const qs = ((data || []) as any[]).map((q) => ({
      ...q,
      options: Array.isArray(q.options) ? q.options : [],
    })) as AnamnesisQuestion[];
    setQuestions(qs);
    setAnswers({});
    setSelectedForm(form);
    setDone(false);
  };

  const handleSubmit = async () => {
    if (!user || !salon || !selectedForm) return;
    // Validate required
    const missing = questions.filter((q) => q.is_required && !answers[q.id]?.trim());
    if (missing.length > 0) {
      toast.error(`Preencha as perguntas obrigatórias: ${missing.map((q) => q.text).join(", ")}`);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("anamnesis_responses").insert({
      form_id: selectedForm.id,
      salon_id: salon.id,
      client_user_id: user.id,
      answers,
    });
    if (error) { toast.error(error.message); setSubmitting(false); return; }

    // Notify owner
    await supabase.from("notifications").insert({
      user_id: salon.owner_id,
      salon_id: salon.id,
      type: "anamnese_respondida",
      title: "Ficha de anamnese respondida 📋",
      message: `Uma cliente respondeu a ficha "${selectedForm.title}".`,
    });

    toast.success("Ficha enviada com sucesso!");
    setDone(true);
    setSubmitting(false);
    fetchData();
  };

  const alreadyAnswered = (formId: string) =>
    existingResponses.some((r) => r.form_id === formId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            {selectedForm ? selectedForm.title : "Fichas de Anamnese"}
          </DialogTitle>
        </DialogHeader>

        {/* Privacy notice */}
        <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
          <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Suas respostas são privadas.</span>{" "}
            Somente você pode preencher estas fichas. O salão não pode alterar suas respostas.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : done ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="font-semibold text-foreground">Ficha enviada!</p>
            <p className="text-sm text-muted-foreground">Suas respostas foram salvas com segurança.</p>
            <Button variant="outline" onClick={() => { setSelectedForm(null); setDone(false); }}>
              Ver outras fichas
            </Button>
          </div>
        ) : !selectedForm ? (
          <div className="space-y-3 py-2">
            {forms.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma ficha disponível no momento.</p>
            ) : (
              forms.map((form) => {
                const answered = alreadyAnswered(form.id);
                return (
                  <div
                    key={form.id}
                    className={`flex items-center justify-between rounded-lg border p-4 transition ${answered ? "border-border opacity-60" : "border-border cursor-pointer hover:border-primary hover:bg-primary/5"}`}
                    onClick={() => !answered && openForm(form)}
                  >
                    <div className="flex items-center gap-3">
                      <ClipboardList className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{form.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {SERVICE_TYPE_LABELS[form.service_type] || form.service_type}
                        </p>
                        {form.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{form.description}</p>
                        )}
                      </div>
                    </div>
                    {answered ? (
                      <Badge variant="outline" className="bg-green-500/15 text-green-700 border-green-500/30 text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Respondida
                      </Badge>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {selectedForm.description && (
              <p className="text-sm text-muted-foreground">{selectedForm.description}</p>
            )}
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Esta ficha ainda não tem perguntas.</p>
            ) : (
              questions.map((q, idx) => (
                <div key={q.id} className="space-y-2">
                  <Label className="text-sm font-medium">
                    {idx + 1}. {q.text}
                    {q.is_required && <span className="text-destructive ml-1">*</span>}
                  </Label>

                  {q.question_type === "text" && (
                    <Textarea
                      rows={2}
                      placeholder="Sua resposta..."
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    />
                  )}

                  {q.question_type === "boolean" && (
                    <RadioGroup
                      value={answers[q.id] || ""}
                      onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="Sim" id={`${q.id}-yes`} />
                        <Label htmlFor={`${q.id}-yes`} className="font-normal cursor-pointer">Sim</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="Não" id={`${q.id}-no`} />
                        <Label htmlFor={`${q.id}-no`} className="font-normal cursor-pointer">Não</Label>
                      </div>
                    </RadioGroup>
                  )}

                  {q.question_type === "select" && (
                    <Select
                      value={answers[q.id] || ""}
                      onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione uma opção" /></SelectTrigger>
                      <SelectContent>
                        {q.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setSelectedForm(null)}>
                Voltar
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar respostas
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientAnamnesis;
