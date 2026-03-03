import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Scissors, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface InviteInfo {
  id: string;
  salon_id: string;
  salon_name: string;
  salon_logo_url: string | null;
  salon_primary_color: string | null;
  role: string;
  expires_at: string | null;
  used_at: string | null;
}

const roleLabels: Record<string, string> = {
  dono: "Dono",
  funcionario: "Funcionário",
};

const TeamInvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [alreadyUsed, setAlreadyUsed] = useState(false);
  const [expired, setExpired] = useState(false);

  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!token) { setNotFound(true); setLoading(false); return; }

      const { data, error } = await supabase.rpc("get_team_invite_by_token", { _token: token });
      if (error || !data || (data as any[]).length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;
      const info = row as InviteInfo;

      if (info.used_at) { setAlreadyUsed(true); setLoading(false); return; }
      if (info.expires_at && new Date(info.expires_at) < new Date()) {
        setExpired(true); setLoading(false); return;
      }

      setInvite(info);

      // If already authenticated, accept the invite immediately
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const result = await supabase.rpc("accept_team_invite", { _token: token });
        const status = typeof result.data === "string" ? result.data : null;
        if (status === "ok") {
          toast.success("Convite aceito! Bem-vindo(a) à equipe.");
          navigate("/");
          return;
        } else if (status === "already_used") {
          setAlreadyUsed(true);
        } else if (status === "expired") {
          setExpired(true);
        } else {
          toast.error("Não foi possível aceitar o convite. Tente novamente.");
        }
      }

      setLoading(false);
    };
    init();
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        setSubmitting(false);
        return;
      }
      // After login, accept the invite
      const result = await supabase.rpc("accept_team_invite", { _token: token });
      const status = typeof result.data === "string" ? result.data : null;
      if (status === "ok") {
        toast.success("Convite aceito! Bem-vindo(a) à equipe.");
        navigate("/");
      } else {
        toast.error("Erro ao aceitar convite. Verifique se o link ainda é válido.");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, salon_team_invite_token: token },
          emailRedirectTo: window.location.origin + "/",
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Conta criada com sucesso! Você já pode fazer login.");
        setIsLogin(true);
      }
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || alreadyUsed || expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <Scissors className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {notFound ? "Link inválido" : alreadyUsed ? "Convite já utilizado" : "Convite expirado"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {notFound
                ? "Este link de convite não existe."
                : alreadyUsed
                ? "Este convite já foi aceito por outro usuário."
                : "Este link de convite expirou. Solicite um novo ao dono do salão."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {invite?.salon_logo_url ? (
            <img
              src={invite.salon_logo_url}
              alt={invite.salon_name}
              className="mx-auto mb-3 h-16 w-16 rounded-xl object-cover"
            />
          ) : (
            <div
              className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl text-primary-foreground"
              style={{ backgroundColor: invite?.salon_primary_color || "hsl(var(--primary))" }}
            >
              <Scissors className="h-7 w-7" />
            </div>
          )}
          <CardTitle className="text-xl">{invite?.salon_name}</CardTitle>
          <CardDescription>
            <span className="font-medium text-primary">{roleLabels[invite?.role ?? ""] ?? invite?.role}</span>
            {" — "}
            {isLogin ? "Entre na sua conta para aceitar o convite" : "Crie sua conta para entrar na equipe"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <UserPlus className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground">
              Você foi convidado para fazer parte da equipe de{" "}
              <strong>{invite?.salon_name}</strong> como{" "}
              <strong>{roleLabels[invite?.role ?? ""] ?? invite?.role}</strong>.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? "Entrar e aceitar convite" : "Criar conta e aceitar convite"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-primary hover:underline"
            >
              {isLogin ? "Criar conta" : "Fazer login"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamInvitePage;
