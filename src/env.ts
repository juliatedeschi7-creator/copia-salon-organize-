/**
 * Central env validation module.
 *
 * Single source of truth for reading and validating the Supabase env vars.
 * Validation rules:
 *   - URL  : non-empty string, starts with "https://", contains "supabase.co"
 *   - Key  : non-empty string, starts with "eyJ" (JWT) or "sb_" (new Supabase
 *            key format), and is at least 32 characters long.
 */

/** Safe preview lengths – show just enough to spot mismatches, not the full secret. */
const URL_PREVIEW_LENGTH = 28;
const KEY_PREVIEW_LENGTH = 12;

export interface EnvValidation {
  url: string | undefined;
  key: string | undefined;
  urlOk: boolean;
  keyOk: boolean;
  /** Safe redacted preview – first 28 chars only */
  urlPreview: string;
  /** Safe redacted preview – first 12 chars + "…" only */
  keyPreview: string;
  urlLength: number;
  keyLength: number;
}

export function validateUrl(url: string | undefined): boolean {
  if (typeof url !== "string" || url.trim().length === 0) return false;
  const t = url.trim();
  return t.startsWith("https://") && t.includes("supabase.co");
}

export function validateKey(key: string | undefined): boolean {
  if (typeof key !== "string" || key.trim().length === 0) return false;
  const t = key.trim();
  // Support legacy JWT anon keys (eyJ...) and newer Supabase publishable keys (sb_...)
  const validPrefix = t.startsWith("eyJ") || t.startsWith("sb_");
  return validPrefix && t.length >= 32;
}

export function validateEnv(): EnvValidation {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  return {
    url,
    key,
    urlOk: validateUrl(url),
    keyOk: validateKey(key),
    urlPreview: typeof url === "string" ? url.slice(0, URL_PREVIEW_LENGTH) : "—",
    keyPreview: typeof key === "string" ? key.slice(0, KEY_PREVIEW_LENGTH) + "…" : "—",
    urlLength: typeof url === "string" ? url.length : 0,
    keyLength: typeof key === "string" ? key.length : 0,
  };
}

export function canBoot(): boolean {
  const { urlOk, keyOk } = validateEnv();
  return urlOk && keyOk;
}

export interface BuildIdentity {
  sha: string;
  env: string;
  url: string;
}

/** Returns the build-time identity injected by vite.config.ts `define`. */
export function getBuildIdentity(): BuildIdentity {
  return {
    sha: __BUILD_SHA__,
    env: __VERCEL_ENV__,
    url: __VERCEL_URL__,
  };
}
