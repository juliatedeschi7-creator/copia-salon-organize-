import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const TeamInvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(false);

  // 🔥 carregar convite
  useEffect(() => {
    const loadInvite = async () => {
      if (!token) return;

      const { data, error } = await supabase.rpc("get_team_invite_by_token", {
        _token: token,
      });

      if (error || !data || data.length === 0) {
        setInvite(null);
      } else {
        setInvite(data[0]);
      }

      setLoading(false);
    };

    loadInvite();
  }, [token]);

  // 🔥 aceitar convite
  const acceptInvite = async (userId: string) => {
    const { data } = await supabase.rpc("accept_team_invite", {
      _token: token,
      _user_id: userId,
    });

    if (data === "ok") {
      alert("Convite aceito! Aguarde aprovação do admin.");
      navigate("/");
    } else {
      alert("Erro ao aceitar convite");
    }
  };

  // 🔥 login / cadastro
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      await acceptInvite(data.user.id);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      // ⚠️ usuário precisa confirmar email às vezes
      if (data.user) {
        await acceptInvite(data.user.id);
      } else {
        alert("Conta criada! Faça login para continuar.");
        setIsLogin(true);
      }
    }
  };

  if (loading) return <p>Carregando...</p>;

  if (!invite) {
    return <p>Link inválido ou expirado</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Convite para equipe</h2>

      <p>
        Você foi convidado para o salão <b>{invite.salon_name}</b> como{" "}
        <b>{invite.role}</b>
      </p>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <br /><br />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <br /><br />

        <button type="submit">
          {isLogin ? "Entrar e aceitar convite" : "Criar conta"}
        </button>
      </form>

      <br />

      <button onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? "Criar conta" : "Já tenho conta"}
      </button>
    </div>
  );
};

export default TeamInvitePage;
