import React from "react";
import { validateEnv, getBuildIdentity } from "../env";

export function BootDiagnostics() {
  const { urlOk, keyOk, urlPreview, keyPreview, urlLength, keyLength } = validateEnv();
  const { sha: buildSha, env: vercelEnv, url: vercelUrl } = getBuildIdentity();

  function handleClearAndReload() {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  }

  return (
    <div style={{ padding: 16, fontFamily: "system-ui", maxWidth: 480 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>Falha ao iniciar</h1>
      <p style={{ marginTop: 8 }}>
        O app não conseguiu iniciar normalmente. Verifique variáveis do Vercel e configurações do Supabase.
      </p>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <p><b>VITE_SUPABASE_URL</b>: {urlOk ? "✅ OK" : "❌ FALTANDO/INVÁLIDA"}</p>
        <p style={{ marginTop: 4 }}><b>VITE_SUPABASE_PUBLISHABLE_KEY</b>: {keyOk ? "✅ OK" : "❌ FALTANDO/INVÁLIDA"}</p>
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
          URL (início): {urlPreview} (len={urlLength})
        </p>
        <p style={{ fontSize: 12, opacity: 0.8 }}>
          Key (início): {keyPreview} (len={keyLength})
        </p>
      </div>

      {(buildSha || vercelEnv || vercelUrl) && (
        <div style={{ marginTop: 12, padding: 10, border: "1px solid #e8e8e8", borderRadius: 8, fontSize: 11, opacity: 0.75 }}>
          <p><b>Build SHA</b>: {buildSha || "—"}</p>
          <p><b>Vercel Env</b>: {vercelEnv || "—"}</p>
          <p><b>Vercel URL</b>: {vercelUrl || "—"}</p>
        </div>
      )}

      <button
        onClick={handleClearAndReload}
        style={{
          marginTop: 16,
          padding: "8px 16px",
          background: "#e53e3e",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 14,
          cursor: "pointer",
          width: "100%",
        }}
      >
        Limpar dados de auth e recarregar
      </button>

      <p style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
        Dica: no Vercel, Settings → Environment Variables → (Production) → redeploy.
      </p>
    </div>
  );
}
