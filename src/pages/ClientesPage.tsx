import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Scissors } from "lucide-react";
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

  useEffect(() => {
    const fetchSalon = async () => {
      if (!linkId) { setNotFound(true); setLoading(false); return; }
      const { data, error } = await supabase.rpc("get_salon_by_client_link", { _link: linkId });
      if (error || !data || (data as any[]).length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      setSalon(row as SalonInfo);

      // If user is already authenticated, link them to this salon directly
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const salonId = (row as SalonInfo).id;
        const userId = session.user.id;
        // Upsert salon membership as cliente
        const { error: memberError } = await supabase
          .from("salon_members")
          .upsert({ salon_id: salonId, user_id: userId, role: "cliente" }, { onConflict: "salon_id,user_id" });
        if (memberError) {
          console.error("Erro ao vincular ao salão:", memberError.message);
          toast.error("Não foi possível vincular sua conta ao salão. Tente novamente.");
        } else {
          toast.success("Você foi vinculado ao salão com sucesso!");
          navigate("/cliente-area");
          return;
        }
      }

      setLoading(false);
    };
    fetchSalon();
  }, [linkId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isLogin) {
      // LOGIN
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        setSubmitting(false);
      } else {
        // Link cliente ao salão após login
        if (salon) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error: memberError } = await supabase
              .from("salon_members")
              .upsert(
                { salon_id: salon.id, user_id: user.id, role: "cliente" },
                { onConflict: "salon_id,user_id" }
              );
            if (memberError) {
              console.error("Erro ao vincular ao salão:", memberError.message);
            }
          }
        }
        navigate("/cliente-area");
      }
    } else {
      // SIGN UP - Criar conta nova
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            full_name: name,
            display_name: name,
            salon_client_link: linkId 
          },
          emailRedirectTo: window.location.origin + "/cliente-area",
        },
      });

      if (error) {
        toast.error(error.message);
        setSubmitting(false);
      } else if (data?.user) {
        try {
          // ✅ ATUALIZAR PROFILE COM O FULL_NAME
          const { error: updateProfileError } = await supabase
            .from("profiles")
            .update({
              full_name: name,
            })
            .eq("id", data.user.id);

          if (updateProfileError) {
            console.error("Erro ao atualizar perfil:", updateProfileError.message);
            toast.warning("Conta criada, mas houve um erro ao salvar o nome. Você pode atualizar depois.");
          }

          // ✅ VINCULAR CLIENTE AO SALÃO IMEDIATAMENTE
          if (salon) {
            const { error: memberError } = await supabase
              .from("salon_members")
              .insert({
                salon_id: salon.id,
                user_id: data.user.id,
                role: "cliente"
              });

            if (memberError) {
              console.error("Erro ao vincular ao salão:", memberError.message);
              toast.error("Conta criada, mas houve um erro ao vincular ao salão. Tente fazer login novamente.");
              setSubmitting(false);
              return;
            }
          }

          toast.success("Conta criada com sucesso! Bem-vindo ao salão!");

          // ✅ AUTO-LOGIN APÓS CRIAR CONTA
          const { error: signInError } = await supabase.auth.signInWithPassword({ 
            email, 
            password 
          });

          if (signInError) {
            toast.error("Conta criada, mas houve um erro no login automático. Tente fazer login manualmente.");
            setSubmitting(false);
          } else {
            navigate("/cliente-area");
          }
        } catch (err) {
          console.error("Erro inesperado:", err);
          toast.error("Houve um erro ao processar o cadastro. Tente novamente.");
          setSubmitting(false);
        }
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
            <p className="mt-2 text-sm text-muted-foreground">
              Este link de convite não existe ou expirou.
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
            {isLogin
              ? "Entre na sua conta de cliente"
              : "Crie sua conta e acesse sua área exclusiva"}
          </CardDescription>
          {!isLogin && (
            <ul className="mt-3 space-y-1 text-left text-xs text-muted-foreground">
              <li>📅 Agende atendimentos com facilidade</li>
              <li>💆 Confira o catálogo de serviços do salão</li>
              <li>📦 Acompanhe o uso e evolução dos seus pacotes</li>
              <li>🔔 Receba notificações e comunicados do salão</li>
            </ul>
          )}
        </CardHeader>
        <CardContent>
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
