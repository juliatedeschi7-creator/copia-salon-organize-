import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Scissors } from "lucide-react";
import { toast } from "sonner";

interface InviteInfo {
  salon_name: string;
  salon_logo_url: string | null;
  salon_primary_color: string | null;
  role: string;
}

const roleLabels: Record<string, string> = {
  dono: "dono",
  funcionario: "funcionário",
};

const TeamInvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadInvite = async () => {
      const { data, error } = await supabase.rpc(
        "get_team_invite_by_token",
        { _token: token }
      );

      if (error || !data) {
        toast.error("Convite inválido");
        setLoading(false);
        return;
      }

      setInvite(data);
      setLoading(false);
    };

    loadInvite();
  }, [token]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setSubmitting(false);
        return;
      }

      navigate("/");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: invite?.role,
            status: "pending", // 🔥 ESSENCIAL pro admin aprovar
          },
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Conta criada! Aguarde aprovação do administrador.");
        setIsLogin(true);
      }
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const primary = invite?.salon_primary_color || "#c0365d";

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background: `linear-gradient(135deg, ${primary}20, #ffffff)`,
      }}
    >
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-4">
          {invite?.salon_logo_url ? (
            <img
              src={invite.salon_logo_url}
              className="h-16 w-16 mx-auto rounded-xl object-cover"
            />
          ) : (
            <div
              className="h-16 w-16 mx-auto flex items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: primary }}
            >
              <Scissors />
            </div>
          )}
          <CardTitle className="text-xl font-bold leading-snug">
  Você foi convidado para ser{" "}
  <span style={{ color: primary }}>
    {invite?.role === "dono"
      ? "dono"
      : invite?.role === "funcionario"
      ? "funcionário"
      : "membro da equipe"}
  </span>{" "}
  no{" "}
  <span className="font-semibold">
    {invite?.salon_name || "salão"}
  </span>
  .
  <br />
  Aceita?
</CardTitle>


  
        </CardHeader>

        <CardContent>
          <p className="text-center text-sm text-muted-foreground mb-4">
            Crie sua conta para entrar na equipe
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label>Nome completo</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              className="w-full text-white"
              style={{ backgroundColor: primary }}
              disabled={submitting}
            >
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isLogin ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <p className="text-center text-sm mt-4">
            {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-semibold underline"
            >
              {isLogin ? "Criar conta" : "Entrar"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamInvitePage;
