import { supabase } from "@/integrations/supabase/client";

export interface SalonClientOption {
  user_id: string;
  displayName: string;
  email: string | null;
}

/**
 * Fetch all clients for a salon from `salon_clients` (joined with `profiles`).
 * Replaces the old pattern of querying `salon_members` with `role = 'cliente'`.
 */
export async function fetchSalonClients(salonId: string): Promise<SalonClientOption[]> {
  const { data, error } = await supabase
    .from("salon_clients")
    .select("user_id, profiles(full_name, name, email)")
    .eq("salon_id", salonId)
    .order("user_id", { ascending: true });

  if (error || !data) {
    if (error) console.error("fetchSalonClients error:", error.message);
    return [];
  }

  return data.map((row: any) => ({
    user_id: row.user_id,
    displayName:
      row.profiles?.full_name ||
      row.profiles?.name ||
      row.profiles?.email ||
      "Cliente",
    email: row.profiles?.email ?? null,
  }));
}