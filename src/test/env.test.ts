import { describe, it, expect, vi, afterEach } from "vitest";
import { validateUrl, validateKey } from "../env";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("validateUrl", () => {
  it("accepts a valid Supabase HTTPS URL", () => {
    expect(validateUrl("https://abcxyz.supabase.co")).toBe(true);
  });

  it("accepts a URL with a path", () => {
    expect(validateUrl("https://myproject.supabase.co/rest/v1")).toBe(true);
  });

  it("rejects http:// (not https)", () => {
    expect(validateUrl("http://myproject.supabase.co")).toBe(false);
  });

  it("rejects a URL that does not contain supabase.co", () => {
    expect(validateUrl("https://example.com")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(validateUrl("")).toBe(false);
  });

  it("rejects undefined", () => {
    expect(validateUrl(undefined)).toBe(false);
  });

  it("rejects whitespace-only string", () => {
    expect(validateUrl("   ")).toBe(false);
  });
});

describe("validateKey", () => {
  it("accepts a JWT-format anon key (eyJ...)", () => {
    const jwtKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.fakeSignature";
    expect(validateKey(jwtKey)).toBe(true);
  });

  it("accepts a new Supabase publishable key (sb_...)", () => {
    const sbKey = "sb_publishable_" + "a".repeat(40);
    expect(validateKey(sbKey)).toBe(true);
  });

  it("rejects a key shorter than 32 characters", () => {
    expect(validateKey("eyJshort")).toBe(false);
  });

  it("rejects a key that does not start with eyJ or sb_", () => {
    const badKey = "pk_" + "a".repeat(60);
    expect(validateKey(badKey)).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(validateKey("")).toBe(false);
  });

  it("rejects undefined", () => {
    expect(validateKey(undefined)).toBe(false);
  });

  it("rejects whitespace-only string", () => {
    expect(validateKey("   ")).toBe(false);
  });
});
