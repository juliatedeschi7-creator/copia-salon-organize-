import { supabase } from "@/integrations/supabase/client";

export const usePackageSession = async ({
  clientId,
  salonId,
  serviceId,
  appointmentId,
  serviceName,
}: {
  clientId: string;
  salonId: string;
  serviceId: string;
  appointmentId: string;
  serviceName: string;
}) => {
  try {
    // 1. Buscar pacote ativo do cliente
    const { data: clientPackages } = await supabase
      .from("client_packages")
      .select("id, expires_at")
      .eq("client_user_id", clientId)
      .eq("salon_id", salonId)
      .gte("expires_at", new Date().toISOString());

    if (!clientPackages || clientPackages.length === 0) {
      return { used: false };
    }

    for (const pkg of clientPackages) {
      // 2. Buscar item do pacote (serviço)
      const { data: items } = await supabase
        .from("client_package_items")
        .select("*")
        .eq("client_package_id", pkg.id)
        .eq("service_id", serviceId);

      if (!items || items.length === 0) continue;

      const item = items[0];

      // 3. Verificar se ainda tem sessões
      if (item.quantity_used >= item.quantity_total) continue;

      // 4. Dar baixa (usar sessão)
      const { error: updateError } = await supabase
        .from("client_package_items")
        .update({
          quantity_used: item.quantity_used + 1,
        })
        .eq("id", item.id);

      if (updateError) throw updateError;

      const remaining = item.quantity_total - (item.quantity_used + 1);

      // 5. Marcar no agendamento que usou pacote
      await supabase
        .from("appointments")
        .update({
          used_package: true,
        })
        .eq("id", appointmentId);

      // 6. Enviar notificação
      await supabase.from("notifications").insert({
        user_id: clientId,
        salon_id: salonId,
        type: "pacote_sessao_usada",
        title: "Sessão utilizada 💅",
        message: `Você utilizou 1 sessão de ${serviceName}. Restam ${remaining} sessão(ões).`,
        reference_id: appointmentId,
      });

      // 7. Notificação extra (pacote acabando)
      if (remaining === 1) {
        await supabase.from("notifications").insert({
          user_id: clientId,
          salon_id: salonId,
          type: "pacote_quase_acabando",
          title: "Seu pacote está acabando ⚠️",
          message: `Falta apenas 1 sessão de ${serviceName}.`,
        });
      }

      if (remaining === 0) {
        await supabase.from("notifications").insert({
          user_id: clientId,
          salon_id: salonId,
          type: "pacote_acabou",
          title: "Pacote finalizado ❗",
          message: `Seu pacote de ${serviceName} foi totalmente utilizado.`,
        });
      }

      return { used: true };
    }

    return { used: false };
  } catch (err) {
    console.error("Erro ao usar pacote:", err);
    return { used: false };
  }
};
