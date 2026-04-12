import { supabase } from "@/integrations/supabase/client";

export const usePackageSession = async (clientId: string, serviceId: string) => {
  const { data, error } = await supabase
    .from("client_package_items")
    .select(`
      id,
      quantity_total,
      quantity_used,
      client_packages!inner (
        client_user_id,
        expires_at
      )
    `)
    .eq("service_id", serviceId)
    .eq("client_packages.client_user_id", clientId)
    .gt("client_packages.expires_at", new Date().toISOString());

  if (error || !data || data.length === 0) {
    throw new Error("Sem pacote válido");
  }

  const item = data[0];

  if (item.quantity_used >= item.quantity_total) {
    throw new Error("Pacote esgotado");
  }

  await supabase
    .from("client_package_items")
    .update({
      quantity_used: item.quantity_used + 1,
    })
    .eq("id", item.id);
};
