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

function safeStorage(): Storage {
  try {
    const k = "__test__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return localStorage;
  } catch {}

  try {
    const k = "__test__";
    sessionStorage.setItem(k, "1");
    sessionStorage.removeItem(k);
    return sessionStorage;
  } catch {}

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