import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── helpers ────────────────────────────────────────────────────────────────

/** Builds the invite URL exactly as ClientesPage does. */
function buildInviteUrl(origin: string, clientLink: string) {
  return `${origin}/convite/${clientLink}`;
}

/**
 * Copies text to clipboard, with the same fallback logic used in
 * ClientesPage.handleCopyInviteLink.
 */
async function copyToClipboard(
  text: string,
  onSuccess: () => void,
  onError: (msg: string) => void
) {
  const fallbackCopy = () => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.cssText = "position:absolute;left:-9999px;top:-9999px;";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      onSuccess();
    } catch {
      onError(`Não foi possível copiar automaticamente. Link: ${text}`);
    } finally {
      document.body.removeChild(textarea);
    }
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      onSuccess();
    } catch {
      fallbackCopy();
    }
  } else {
    fallbackCopy();
  }
}

// ── tests ──────────────────────────────────────────────────────────────────

describe("buildInviteUrl", () => {
  it("generates the correct invite URL", () => {
    const url = buildInviteUrl("https://example.com", "abc-123");
    expect(url).toBe("https://example.com/convite/abc-123");
  });

  it("works with UUID-style client links", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const url = buildInviteUrl("https://salon.app", uuid);
    expect(url).toBe(`https://salon.app/convite/${uuid}`);
  });
});

describe("copyToClipboard", () => {
  beforeEach(() => {
    // Reset clipboard mock before each test
    Object.defineProperty(navigator, "clipboard", {
      writable: true,
      value: undefined,
    });
    // Stub execCommand
    document.execCommand = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses navigator.clipboard when available and calls onSuccess", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      writable: true,
      value: { writeText },
    });

    const onSuccess = vi.fn();
    const onError = vi.fn();

    await copyToClipboard("https://example.com/convite/abc", onSuccess, onError);

    expect(writeText).toHaveBeenCalledWith("https://example.com/convite/abc");
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("falls back to execCommand when clipboard API rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      writable: true,
      value: { writeText },
    });

    const onSuccess = vi.fn();
    const onError = vi.fn();

    await copyToClipboard("https://example.com/convite/abc", onSuccess, onError);

    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("falls back to execCommand when clipboard API is unavailable", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await copyToClipboard("https://example.com/convite/abc", onSuccess, onError);

    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("calls onError with URL when execCommand also throws", async () => {
    (document.execCommand as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("execCommand unsupported");
    });

    const onSuccess = vi.fn();
    const onError = vi.fn();
    const url = "https://example.com/convite/abc";

    await copyToClipboard(url, onSuccess, onError);

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.stringContaining(url));
  });
});
