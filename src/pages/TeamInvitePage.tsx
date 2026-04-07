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
      if (!token) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // 🔥 busca convite corretamente
      const { data, error } = await supabase.rpc("get_team_invite_by_token", { _token: token });

      if (error || !data || (data as any[]).length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const inviteData = Array.isArray(data) ? data[0] : data;

      if (inviteData.used_at) {
        setAlreadyUsed(true);
        setLoading(false);
        return;
      }

      if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
        setExpired(true);
        setLoading(false);
        return;
      }

      setInvite(inviteData);

      // 🔥 aceita automaticamente se já estiver logado
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const result = await supabase.rpc("accept_team_invite", {
          _token: token,
          _user_id: session.user.id
        });

        if (result.data === "ok") {
          toast.success("Convite aceito! 🎉");
          navigate("/");
          return;
        }

        if (result.data === "already_used") setAlreadyUsed(true);
        if (result.data === "expired") setExpired(true);
      }

      setLoading(false);
    };

    init();
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (!token) {
      toast.error("Token inválido");
      setSubmitting(false);
      return;
    }

    if (isLogin) {
      // 🔥 login
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast.error(error.message);
        setSubmitting(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const result = await supabase.rpc("accept_team_invite", {
        _token: token,
        _user_id: user?.id
      });

      if (result.data === "ok") {
        toast.success("Convite aceito! 🎉");
        navigate("/");
      } else {
        toast.error("Erro ao aceitar convite.");
      }
    } else {
      // 🔥 cadastro
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Conta criada! Agora faça login.");
        setIsLogin(true);
      }
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (notFound || alreadyUsed || expired) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <Scissors className="mx-auto mb-4 h-12 w-12" />
            <h2 className="text-lg font-semibold">
              {notFound ? "Link inválido" : alreadyUsed ? "Convite já utilizado" : "Convite expirado"}
            </h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{invite?.salon_name}</CardTitle>
          <CardDescription>
            {isLogin ? "Entre para aceitar o convite" : "Crie sua conta"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            {!isLogin && (
              <Input
                placeholder="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}

            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button className="w-full" disabled={submitting}>
              {submitting ? "Carregando..." : isLogin ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <p className="text-center mt-4 text-sm">
            {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Criar" : "Entrar"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamInvitePage;
