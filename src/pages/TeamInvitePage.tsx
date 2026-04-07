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
      try {
        if (!token) {
          setNotFound(true);
          return;
        }

        // 🔍 buscar convite
        const { data, error } = await supabase.rpc("get_team_invite_by_token", {
          _token: token,
        });

        console.log("INVITE DATA:", data);
        console.log("INVITE ERROR:", error);

        if (error || !data) {
          setNotFound(true);
          return;
        }

        const row = Array.isArray(data) ? data[0] : data;

        if (!row) {
          setNotFound(true);
          return;
        }

        const info = row as InviteInfo;

        // 🚫 já usado
        if (info.used_at) {
          setAlreadyUsed(true);
          return;
        }

        // ⏰ expirado
        if (info.expires_at && new Date(info.expires_at) < new Date()) {
          setExpired(true);
          return;
        }

        setInvite(info);

        // 🔐 se já estiver logado → aceita direto
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const result = await supabase.rpc("accept_team_invite", {
            _token: token,
            _user_id: session.user.id, // 🔥 IMPORTANTE
          });

          const status = result.data;

          if (status === "ok") {
            toast.success("Convite aceito! 🎉");
            navigate("/");
            return;
          }

          if (status === "already_used") setAlreadyUsed(true);
          else if (status === "expired") setExpired(true);
          else toast.error("Erro ao aceitar convite.");
        }
      } catch (err) {
        console.error("Erro geral:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();

        const result = await supabase.rpc("accept_team_invite", {
          _token: token,
          _user_id: user?.id,
        });

        if (result.data === "ok") {
          toast.success("Convite aceito!");
          navigate("/");
        } else {
          toast.error("Erro ao aceitar convite.");
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              salon_team_invite_token: token, // 🔥 importante pro backend
            },
          },
        });

        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Conta criada! Faça login.");
          setIsLogin(true);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  };

  // ⏳ loading
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  // ❌ erros
  if (notFound || alreadyUsed || expired) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <h2>
              {notFound
                ? "Link inválido"
                : alreadyUsed
                ? "Convite já usado"
                : "Convite expirado"}
            </h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ tela principal
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{invite?.salon_name}</CardTitle>
          <CardDescription>
            Você foi convidado como{" "}
            {roleLabels[invite?.role ?? ""] ?? invite?.role}
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

            <Button type="submit" disabled={submitting}>
              {isLogin ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <p className="text-center mt-4 text-sm">
            <button onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Criar conta" : "Já tenho conta"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamInvitePage;
