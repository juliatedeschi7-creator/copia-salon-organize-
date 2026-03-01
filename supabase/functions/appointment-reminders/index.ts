import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const nowStr = now.toISOString();

    // Get appointments in the next 25 hours that are approved
    const futureLimit = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const today = now.toISOString().split("T")[0];
    const tomorrow = futureLimit.toISOString().split("T")[0];

    const { data: appointments, error: fetchErr } = await supabase
      .from("appointments")
      .select("id, appointment_date, start_time, client_user_id, service_id, salon_id, status")
      .in("appointment_date", [today, tomorrow])
      .eq("status", "aprovado");

    if (fetchErr) {
      console.error("Error fetching appointments:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ message: "No upcoming appointments", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get service names
    const serviceIds = [...new Set(appointments.map((a) => a.service_id))];
    const { data: services } = await supabase
      .from("services")
      .select("id, name")
      .in("id", serviceIds);
    const serviceMap: Record<string, string> = {};
    (services || []).forEach((s: any) => { serviceMap[s.id] = s.name; });

    // Get salon reminder_hours configs
    const salonIds = [...new Set(appointments.map((a) => a.salon_id))];
    const { data: salons } = await supabase
      .from("salons")
      .select("id, reminder_hours")
      .in("id", salonIds);
    const salonReminderMap: Record<string, number[]> = {};
    (salons || []).forEach((s: any) => {
      salonReminderMap[s.id] = Array.isArray(s.reminder_hours) ? s.reminder_hours : [24, 2];
    });

    // Check existing reminder notifications to avoid duplicates
    const appointmentIds = appointments.map((a) => a.id);
    const { data: existingNotifs } = await supabase
      .from("notifications")
      .select("reference_id, type")
      .in("reference_id", appointmentIds)
      .like("type", "lembrete_%");

    const existingSet = new Set(
      (existingNotifs || []).map((n: any) => `${n.reference_id}_${n.type}`)
    );

    const notificationsToInsert: any[] = [];

    for (const appt of appointments) {
      const apptDateTime = new Date(`${appt.appointment_date}T${appt.start_time}`);
      const diffMs = apptDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      const serviceName = serviceMap[appt.service_id] || "Serviço";
      const timeStr = appt.start_time.slice(0, 5);
      const reminderHours = salonReminderMap[appt.salon_id] || [24, 2];

      // Sort descending so we check larger windows first
      const sortedHours = [...reminderHours].sort((a, b) => b - a);

      for (const targetHours of sortedHours) {
        // Window: within the target hour range + 1h buffer past
        const windowMin = targetHours - 1;
        const windowMax = targetHours + 1;
        if (diffHours > 0 && diffHours >= windowMin && diffHours <= windowMax) {
          const typeKey = `lembrete_${targetHours}h`;
          const notifKey = `${appt.id}_${typeKey}`;
          if (!existingSet.has(notifKey)) {
            const isLong = targetHours >= 12;
            notificationsToInsert.push({
              user_id: appt.client_user_id,
              salon_id: appt.salon_id,
              type: typeKey,
              title: isLong
                ? `Lembrete: atendimento em ${targetHours}h! 📅`
                : `Seu atendimento é em breve! ⏰`,
              message: isLong
                ? `Seu ${serviceName} está agendado para daqui ${targetHours} horas às ${timeStr}. Não esqueça!`
                : `${serviceName} às ${timeStr}. Estamos te esperando!`,
              reference_id: appt.id,
            });
            existingSet.add(notifKey);
          }
        }
      }
    }

    if (notificationsToInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from("notifications")
        .insert(notificationsToInsert);
      if (insertErr) {
        console.error("Error inserting notifications:", insertErr);
        return new Response(JSON.stringify({ error: insertErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`Sent ${notificationsToInsert.length} reminders`);
    return new Response(
      JSON.stringify({ message: "Reminders processed", sent: notificationsToInsert.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
