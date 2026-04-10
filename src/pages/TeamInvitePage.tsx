import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const TeamInvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  // 🔥 BUSCAR CONVITE
  useEffect(() => {
    const loadInvite = async () => {
      if (!token) return;

      const { data, error } = await supabase
        .rpc("get_team_invite_by_token", { _token: token });

      if (error || !data || data.length === 0) {
        setError("Convite inválido ou expirado.");
        setLoading(false);
        return;
      }

      setInvite(data[0]);
      setLoading(false);
    };

    loadInvite();
  }, [token]);

  // 🚀 CRIAR CONTA + VINCULAR
  const handleSignup = async () => {
    setCreating(true);

    // 1. cria usuário
    const { data: signUpData, error: signUpError } =
      await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

    if (signUpError || !signUpData.user) {
      setError(signUpError?.message || "Erro ao criar conta");
      setCreating(false);
      return;
    }

    const user = signUpData.user;

    // 2. cria profile
    await supabase.from("profiles").insert({
      id: user.id,
      full_name: form.name,
      role: invite.role,
      status: "pending", // 🔥 vai pro admin
    });

    // 3. vincula ao salão
    await supabase.from("salon_members").insert({
      user_id: user.id,
      salon_id: invite.salon_id,
      role: invite.role,
    });

    // 4. marca convite como usado
    await supabase
      .from("team_invites")
      .update({
        used_at: new Date().toISOString(),
        used_by: user.id,
      })
      .eq("token", token);

    // 5. redireciona
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-white">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-pink-600 mb-2">
          {invite?.salon_name}
        </h1>

        <p className="text-gray-600 mb-6">
          Você foi convidado para ser{" "}
          <strong>
            {invite?.role === "dono" ? "Dono" : "Funcionário"}
          </strong>{" "}
          neste salão.
        </p>

        <input
          type="text"
          placeholder="Seu nome"
          className="w-full mb-3 p-2 border rounded"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          type="email"
          placeholder="Seu email"
          className="w-full mb-3 p-2 border rounded"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          type="password"
          placeholder="Senha"
          className="w-full mb-4 p-2 border rounded"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button
          onClick={handleSignup}
          disabled={creating}
          className="w-full bg-pink-600 text-white py-2 rounded hover:bg-pink-700"
        >
          {creating ? "Criando..." : "Criar conta"}
        </button>
      </div>
    </div>
  );
};

export default TeamInvitePage;
