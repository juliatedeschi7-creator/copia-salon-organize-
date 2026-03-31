import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BootDiagnostics } from "./components/BootDiagnostics";
import { canBoot } from "./env";

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