import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// 🔥 SUPORTA OS DOIS NOMES (BLINDADO)
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// 🚨 VALIDAÇÃO (isso evita bug silencioso)
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ ERRO SUPABASE ENV:");
  console.log("URL:", SUPABASE_URL);
  console.log("KEY:", SUPABASE_KEY);
  throw new Error("Supabase env não configurado");
}

// 🔥 storage seguro
function createMemoryStorage(): Storage {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

// ✅ MELHORADO: Detecção robusta de modo privado/incógnito
function safeStorage(): Storage {
  // Testa localStorage com erro apropriado
  try {
    const test = "__storage_test_" + Math.random();
    localStorage.setItem(test, "1");
    localStorage.removeItem(test);
    return localStorage;
  } catch (e: any) {
    // Se lançou QuotaExceededError em modo privado, usa fallback
    if (e.name === "QuotaExceededError") {
      console.warn("⚠️ Modo privado detectado - usando storage em memória");
      return createMemoryStorage();
    }
  }

  // Testa sessionStorage como fallback
  try {
    const test = "__storage_test_" + Math.random();
    sessionStorage.setItem(test, "1");
    sessionStorage.removeItem(test);
    return sessionStorage;
  } catch (e: any) {
    if (e.name === "QuotaExceededError") {
      console.warn("⚠️ Modo privado/sessionStorage desativado - usando storage em memória");
      return createMemoryStorage();
    }
  }

  // Fallback final
  console.warn("⚠️ Storage desativado - usando memória");
  return createMemoryStorage();
}

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      storage: safeStorage(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);