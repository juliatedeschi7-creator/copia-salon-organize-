import React from "react";

export function BootDiagnostics() {
  const url = (import.meta as any)?.env?.VITE_SUPABASE_URL;
  const key = (import.meta as any)?.env?.VITE_SUPABASE_PUBLISHABLE_KEY;

  const okUrl = typeof url === "string" && url.startsWith("http");
  const okKey = typeof key === "string" && key.length > 30;

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>Falha ao iniciar</h1>
      <p style={{ marginTop: 8 }}>
        O app não conseguiu iniciar normalmente. Verifique variáveis do Vercel e configurações do Supabase.
      </p>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <p><b>VITE_SUPABASE_URL</b>: {okUrl ? "OK" : "FALTANDO/INVÁLIDA"}</p>
        <p><b>VITE_SUPABASE_PUBLISHABLE_KEY</b>: {okKey ? "OK" : "FALTANDO/INVÁLIDA"}</p>
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
          URL (início): {typeof url === "string" ? url.slice(0, 28) : "—"}
        </p>
        <p style={{ fontSize: 12, opacity: 0.8 }}>
          Key (início): {typeof key === "string" ? key.slice(0, 12) + "…" : "—"}
        </p>
      </div>

      <p style={{ marginTop: 16, fontSize: 12, opacity: 0.8 }}>
        Dica: no Vercel, Settings → Environment Variables → (Production) → redeploy.
      </p>
    </div>
  );
}