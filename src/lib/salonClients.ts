import { supabase } from "@/integrations/supabase/client";

export interface SalonClientOption {
  user_id: string;
  displayName: string;
  email: string | null;
  status: "pendente" | "aprovado" | "recusado";
}

/**
 * Fetch all clients for a salon from `salon_clients`
 * now includes status control (pendente / aprovado / recusado)
 */
export async function fetchSalonClients(
  salonId: string
): Promise<SalonClientOption[]> {
  const { data, error } = await supabase
    .from("salon_clients")
    .select(
      `
      user_id,
      status,
      profiles(full_name, name, email)
    `
    )
    .eq("salon_id", salonId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) console.error("fetchSalonClients error:", error.message);
    return [];
  }

  return data.map((row: any) => ({
    user_id: row.user_id,
    status: row.status ?? "pendente",
    displayName:
      row.profiles?.full_name ||
      row.profiles?.name ||
      row.profiles?.email ||
      "Cliente",
    email: row.profiles?.email ?? null,
  }));
}
