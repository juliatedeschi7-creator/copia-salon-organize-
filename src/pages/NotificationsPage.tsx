import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Bell,
  Send,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Search,
  Loader2,
  Package,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/contexts/SalonContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  user_id: string;
  salon_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  reference_id: string | null;
  created_at: string;
}

const typeLabelMap: Record<string, { label: string; className: string }> = {
  novo_agendamento: { label: "Agendamento", className: "bg-primary/15 text-primary border-primary/30" },
  agendamento_aprovado: { label: "Aprovado", className: "bg-green-500/15 text-green-700 border-green-500/30" },
  agendamento_recusado: { label: "Recusado", className: "bg-destructive/15 text-destructive border-destructive/30" },
  agendamento_cancelado: { label: "Cancelado", className: "bg-destructive/15 text-destructive border-destructive/30" },
  agendamento_concluido: { label: "Concluído", className: "bg-green-500/15 text-green-700 border-green-500/30" },
  promocao: { label: "Promoção 🎉", className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
};

const NotificationsPage = () => {
  const { salon } = useSalon();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchNotifications = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) { console.error(error); }
    setNotifications((data || []) as Notification[]);
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, [user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("owner-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        const n = payload.new as Notification;
        toast.info(n.title, { description: n.message });
        setNotifications((prev) => [n, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("Todas marcadas como lidas!");
  };

  const filtered = notifications.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.message.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: notifications.length,
    unread: notifications.filter((n) => !n.is_read).length,
    read: notifications.filter((n) => n.is_read).length,
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
          <p className="text-sm text-muted-foreground">Acompanhe agendamentos e atualizações do salão</p>
        </div>
        {stats.unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.unread}</p>
              <p className="text-xs text-muted-foreground">Não lidas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.read}</p>
              <p className="text-xs text-muted-foreground">Lidas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar notificações..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Bell className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {notifications.length === 0 ? "Nenhuma notificação ainda" : "Nenhuma notificação encontrada"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const typeInfo = typeLabelMap[n.type] || { label: n.type, className: "bg-muted text-muted-foreground border-border" };
            return (
              <Card
                key={n.id}
                className={`cursor-pointer transition hover:shadow-sm ${!n.is_read ? "border-primary/30 bg-primary/5" : ""}`}
                onClick={() => !n.is_read && markAsRead(n.id)}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${!n.is_read ? "bg-primary/10" : "bg-muted"}`}>
                     {n.type === "novo_agendamento" ? <Calendar className="h-4 w-4 text-primary" /> :
                     n.type === "agendamento_aprovado" || n.type === "agendamento_concluido" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                     n.type === "agendamento_recusado" || n.type === "agendamento_cancelado" ? <XCircle className="h-4 w-4 text-destructive" /> :
                     n.type === "promocao" ? <Bell className="h-4 w-4 text-yellow-600" /> :
                     n.type?.startsWith("lembrete_") ? <Clock className="h-4 w-4 text-primary" /> :
                     <Bell className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <Badge variant="outline" className={`text-[10px] ${typeInfo.className}`}>{typeInfo.label}</Badge>
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(n.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
