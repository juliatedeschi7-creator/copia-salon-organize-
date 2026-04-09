import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AuthPage = () => {
  const { salonId } = useParams();

  const [salonName, setSalonName] = useState("");
  const [loadingSalon, setLoadingSalon] = useState(true);

  useEffect(() => {
    const loadSalon = async () => {
      if (!salonId) {
        setLoadingSalon(false);
        return;
      }

      const { data } = await supabase
        .from("salons")
        .select("name")
        .eq("id", salonId)
        .single();

      if (data) {
        setSalonName(data.name);
      }

      setLoadingSalon(false);
    };

    loadSalon();
  }, [salonId]);

  if (loadingSalon) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-white px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-6">

        {/* 🔥 SALÃO */}
        {salonName && (
          <div className="text-center">
            <p className="text-sm text-gray-500">Bem-vindo ao</p>
            <h1 className="text-2xl font-bold text-pink-600">
              {salonName}
            </h1>
          </div>
        )}

        <h2 className="text-xl font-semibold text-center">
          Entrar
        </h2>

        <div className="space-y-3">
          <input
            type="email"
            placeholder="E-mail"
            className="w-full border rounded-lg px-4 py-3"
          />

          <input
            type="password"
            placeholder="Senha"
            className="w-full border rounded-lg px-4 py-3"
          />
        </div>

        <button className="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 transition">
          Entrar
        </button>

        <p className="text-center text-sm">
          Não tem conta?{" "}
          <span className="text-pink-600 font-medium cursor-pointer">
            Criar conta
          </span>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
