import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const TeamInvitePage = () => {
  const { token } = useParams();
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadInvite = async () => {
      if (!token) return;

      const { data, error } = await supabase
        .rpc("get_team_invite_by_token", { _token: token });

      if (error || !data || data.length === 0) {
        setError(true);
        setLoading(false);
        return;
      }

      setInvite(data[0]);
      setLoading(false);
    };

    loadInvite();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-500 font-semibold">Convite inválido</p>
      </div>
    );
  }

  const roleText = invite.role === "dono" ? "dono" : "funcionário";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-100 to-white px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 space-y-6 text-center">
        
        <h1 className="text-2xl font-bold text-gray-800">
          Você foi convidado para ser{" "}
          <span className="text-pink-600">{roleText}</span>
        </h1>

        <p className="text-gray-600">
          no salão{" "}
          <span className="font-semibold text-gray-800">
            {invite.salon_name}
          </span>
        </p>

        <div className="pt-4">
          <a
            href="/"
            className="block w-full rounded-xl bg-pink-600 text-white py-3 font-semibold hover:bg-pink-700 transition"
          >
            Criar conta / Entrar
          </a>
        </div>

      </div>
    </div>
  );
};

export default TeamInvitePage;
