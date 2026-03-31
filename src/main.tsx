import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BootDiagnostics } from "./components/BootDiagnostics";

function canBoot() {
  const url = (import.meta as any)?.env?.VITE_SUPABASE_URL;
  const key = (import.meta as any)?.env?.VITE_SUPABASE_PUBLISHABLE_KEY;

  const okUrl = typeof url === "string" && url.startsWith("http");
  const okKey = typeof key === "string" && key.length > 30;

  return okUrl && okKey;
}

const el = document.getElementById("root");

if (!el) {
  // If root element is missing, fail loudly (helps in debugging broken HTML)
  throw new Error("Root element #root not found");
}

createRoot(el).render(
  <React.StrictMode>
    {canBoot() ? <App /> : <BootDiagnostics />}
  </React.StrictMode>
);