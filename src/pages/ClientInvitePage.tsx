import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Scissors, Clock } from "lucide-react";
import { toast } from "sonner";

interface SalonInfo {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
}

const ClientInvitePage = () => {
  const { linkId } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  const [salon, setSalon] = useState<SalonInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /** Call accept_client_invite RPC to link user to salon as pending cliente */
  const linkClientToSalon = async (userId: string): Promise<boolean> => {
    if (!linkId) return false;

    const { data, error } = await supabase.rpc("accept_client_invite", {
      _link: linkId,
      _user_id: userId,
    });

    if (error) {
      console.error("accept_client_invite error:", error);
      toast.error("Não foi possível vincular sua conta ao salão. Tente novamente.");
      return false;
    }

    // RPC returns a status string
    if (data === "ok") return true;

    if (data === "not_found") {
      toast.error("Link de convite inválido ou salão não encontrado.");
      return false;
    }

    if (data === "forbidden") {
      toast.error(
        "Sua sessão não foi reconhecida. Saia e entre novamente para concluir o vínculo com o salão."
      );
      return false;
    }

    console.error("accept_client_invite unexpected status:", data);
    toast.error("Não foi possível concluir o vínculo com o salão. Tente novamente.");
    return false;
  };

  useEffect(() => {
    const fetchSalon = async () => {
      if (!linkId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("get_salon_by_client_link", { _link: linkId });
      if (error || !data || (data as any[]).length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;
      setSalon(row as SalonInfo);

      // If user is already authenticated, link them to this salon via RPC
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const ok = await linkClientToSalon(session.user.id);
        if (ok) {
          toast.success("Cadastro de cliente registrado! Aguardando aprovação do salão.");
          navigate("/");
          return;
        }
      }

      setLoading(false);
    };

    fetchSalon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        setSubmitting(false);
      } else {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) {
          console.error("getUser after login error:", userErr);
        }

        if (user) {
          const ok = await linkClientToSalon(user.id);
          if (!ok) {
            setSubmitting(false);
            return;
          }
        }

        toast.success("Login realizado! Aguardando aprovação do dono do salão.");
        navigate("/");
      }
    } else {
      // SIGN UP
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            full_name: name,
            salon_client_link: linkId,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        toast.error(error.message);
        setSubmitting(false);
      } else if (data?.user) {
        // Auto sign-in so we can call the RPC immediately
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
          console.error("signInAfterSignUp error:", signInError);
        } else {
          // Use the user from the CURRENT session (more reliable on iOS/Safari)
          const { data: userData, error: userErr } = await supabase.auth.getUser();

          if (userErr || !userData?.user) {
            console.error("getUser after signIn error:", userErr);
            toast.error(
              "Conta criada, mas não foi possível finalizar o login. Faça login novamente para concluir o vínculo com o salão."
            );
          } else {
            await linkClientToSalon(userData.user.id);
          }
        }

        toast.success("Conta criada! Aguardando aprovação do dono do salão.");
        navigate("/");
      } else {
        setSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <Scissors className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Link inválido</h2>
            <p className="mt-2 text-sm text-muted-foreground">Este link de convite não existe ou expirou.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {salon?.logo_url ? (
            <img src={salon.logo_url} alt={salon.name} className="mx-auto mb-3 h-16 w-16 rounded-xl object-cover" />
          ) : (
            <div
              className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl text-primary-foreground"
              style={{ backgroundColor: salon?.primary_color || "hsl(var(--primary))" }}
            >
              <Scissors className="h-7 w-7" />
            </div>
          )}
          <CardTitle className="text-xl">{salon?.name}</CardTitle>
          <CardDescription className="mt-1">
            {isLogin ? "Entre na sua conta de cliente" : "Crie sua conta e acesse sua área exclusiva"}
          </CardDescription>

          {!isLogin && (
            <>
              <ul className="mt-3 space-y-1 text-left text-xs text-muted-foreground">
                <li>📅 Agende atendimentos com facilidade</li>
                <li>💆 Confira o catálogo de serviços do salão</li>
                <li>🗒️ Acompanhe o uso e evolução dos seus pacotes</li>
                <li>🔔 Receba notificações e comunicados do salão</li>
              </ul>

              <div className="mt-3 flex items-start gap-2 rounded-md bg-muted/60 p-2 text-left text-xs text-muted-foreground">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Após criar a conta, aguarde a aprovação do dono do salão para acessar sua área.</span>
              </div>
            </>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required />
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
              {isLogin ? "Entrar" : "Criar conta"}
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

export default ClientInvitePage;
