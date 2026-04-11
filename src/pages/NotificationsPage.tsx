import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/contexts/SalonContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface Client {
  id: string;
  full_name: string;
}

const NotificationsPage = () => {
  const { salon } = useSalon();
  const { user } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const [schedule, setSchedule] = useState("now");

  // 🔥 BUSCAR CLIENTES DO SALÃO
  const fetchClients = async () => {
    if (!salon?.id) return;

    const { data } = await supabase
      .from("salon_members")
      .select("user_id, profiles(full_name)")
      .eq("salon_id", salon.id);

    const formatted =
      data?.map((item: any) => ({
        id: item.user_id,
        full_name: item.profiles?.full_name || "Sem nome",
      })) || [];

    setClients(formatted);
  };

  useEffect(() => {
    fetchClients();
  }, [salon]);

  // 🔎 filtro
  const filtered = clients.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  // ✅ selecionar todos
  const selectAll = () => {
    setSelected(filtered.map((c) => c.id));
  };

  // ❌ limpar seleção
  const clearSelection = () => {
    setSelected([]);
  };

  // 🔘 selecionar individual
  const toggleClient = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  };

  // 🕒 calcular agendamento
  const getScheduledDate = () => {
    const now = new Date();

    if (schedule === "1d") return new Date(now.getTime() + 86400000);
    if (schedule === "7d") return new Date(now.getTime() + 7 * 86400000);
    if (schedule === "30d") return new Date(now.getTime() + 30 * 86400000);

    return now;
  };

  // 🚀 ENVIAR
  const sendNotification = async () => {
    if (!title || !message) {
      toast.error("Preencha título e mensagem");
      return;
    }

    if (selected.length === 0) {
      toast.error("Selecione pelo menos um cliente");
      return;
    }

    setLoading(true);

    const scheduledDate = getScheduledDate();

    const payload = selected.map((userId) => ({
      user_id: userId,
      salon_id: salon.id,
      title,
      message,
      type: "promocao",
      scheduled_for: scheduledDate.toISOString(),
    }));

    const { error } = await supabase
      .from("notifications")
      .insert(payload);

    setLoading(false);

    if (error) {
      toast.error("Erro ao enviar");
      return;
    }

    toast.success("Notificação enviada 🚀");

    setTitle("");
    setMessage("");
    setSelected([]);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Disparar Notificações</h1>

      {/* FORM */}
      <Card>
        <CardContent className="space-y-4 p-4">
          <Input
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Input
            placeholder="Mensagem"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          {/* AGENDAMENTO */}
          <div className="flex gap-2 flex-wrap">
            <Button variant={schedule === "now" ? "default" : "outline"} onClick={() => setSchedule("now")}>
              Agora
            </Button>
            <Button variant={schedule === "1d" ? "default" : "outline"} onClick={() => setSchedule("1d")}>
              1 dia
            </Button>
            <Button variant={schedule === "7d" ? "default" : "outline"} onClick={() => setSchedule("7d")}>
              7 dias
            </Button>
            <Button variant={schedule === "30d" ? "default" : "outline"} onClick={() => setSchedule("30d")}>
              30 dias
            </Button>
          </div>

          {/* BOTÕES */}
          <div className="flex gap-2">
            <Button onClick={selectAll}>Selecionar todos</Button>
            <Button variant="outline" onClick={clearSelection}>
              Limpar
            </Button>
          </div>

          {/* BUSCA */}
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* LISTA */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => toggleClient(c.id)}
                className={`p-2 border rounded cursor-pointer ${
                  selected.includes(c.id) ? "bg-primary/10 border-primary" : ""
                }`}
              >
                {c.full_name}
              </div>
            ))}
          </div>

          <Button onClick={sendNotification} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Send />}
            Enviar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;
