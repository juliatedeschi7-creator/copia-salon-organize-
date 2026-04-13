import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  const [birthDate, setBirthDate] = useState("");
  const [birthDateError, setBirthDateError] = useState("");
  const [needsBirthDate, setNeedsBirthDate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const saveBirthDate = async (userId: string, date: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ birth_date: date })
      .eq("id", userId);

    if (error) {
      console.error(error);
      toast.error("Erro ao salvar data de nascimento");
      return false;
    }

    return true;
  };

  const linkClientToSalon = async (userId: string) => {
    if (!linkId) return false;

    const { data, error } = await supabase.rpc("accept_client_invite", {
      _link: linkId,
      _user_id: userId,
    });

    if (error || data !== "ok") {
      toast.error("Erro ao vincular cliente ao salão");
      return false;
    }

    return true;
  };

  useEffect(() => {
    const fetchSalon = async () => {
      setLoading(true);

      try {
        if (!linkId) {
          setNotFound(true);
          return;
        }

        const { data, error } = await supabase.rpc(
          "get_salon_by_client_link",
          { _link: linkId }
        );

        if (error || !data || (data as any[]).length === 0) {
          setNotFound(true);
          return;
        }

        const row = Array.isArray(data) ? data[0] : data;
        setSalon(row as SalonInfo);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("birth_date")
            .eq("id", session.user.id)
            .single();

          if (!profile?.birth_date) {
            setNeedsBirthDate(true);
            return;
          }

          const ok = await linkClientToSalon(session.user.id);

          if (ok) {
            toast.success("Cliente vinculado com sucesso!");
            navigate("/");
            return;
          }
        }
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false); // 🔥 GARANTE QUE NUNCA TRAVA
      }
    };

    fetchSalon();
  }, [linkId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!isLogin) {
        if (!birthDate) {
          setBirthDateError("Informe sua data de nascimento");
          return;
        }
      }

      if (needsBirthDate) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const okBirth = await saveBirthDate(user.id, birthDate);
        if (!okBirth) return;

        const ok = await linkClientToSalon(user.id);
        if (ok) {
          toast.success("Cadastro concluído!");
          navigate("/");
        }

        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await linkClientToSalon(user.id);
        }

        navigate("/");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            full_name: name,
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data?.user) {
        const okBirth = await saveBirthDate(data.user.id, birthDate);

        if (okBirth) {
          await linkClientToSalon(data.user.id);
        }

        toast.success("Conta criada com sucesso!");
        navigate("/");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Convite inválido ou expirado</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{salon?.name}</CardTitle>
          <CardDescription>
            {isLogin ? "Login cliente" : "Criar conta cliente"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <Input
                placeholder="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}

            <Input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {!isLogin && (
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            )}

            <Button disabled={submitting} className="w-full">
              {submitting ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : isLogin ? (
                "Entrar"
              ) : (
                "Criar conta"
              )}
            </Button>
          </form>

          <button
            className="text-sm mt-3 text-blue-500"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Criar conta" : "Já tenho conta"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientInvitePage;
