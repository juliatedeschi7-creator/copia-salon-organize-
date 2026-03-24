import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldOff, LogOut, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

interface BlockedAccessPageProps {
  title?: string;
  description?: string;
  message?: string;
  diagnostic?: string | null;
}

const BlockedAccessPage = ({
  title = "Acesso bloqueado",
  description = "Seu acesso ao sistema foi bloqueado pelo administrador.",
  message,
  diagnostic,
}: BlockedAccessPageProps) => {
  const { signOut, profile } = useAuth();
  const [showDiag, setShowDiag] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!diagnostic) return;
    try {
      await navigator.clipboard.writeText(diagnostic);
    } catch {
      // Fallback for browsers/environments where clipboard API is unavailable.
      // document.execCommand is deprecated but intentionally kept here for
      // maximum mobile browser compatibility (e.g. older iOS Safari versions).
      try {
        const ta = document.createElement("textarea");
        ta.value = diagnostic;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        // If even the fallback fails, the user can still select and copy manually
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10">
            <ShieldOff className="h-7 w-7 text-destructive" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm text-foreground">{message}</p>
            </div>
          )}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              Conta: <span className="font-medium text-foreground">{profile?.email}</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Entre em contato com o administrador para obter mais informações.
          </p>
          {diagnostic && (
            <div className="text-left">
              <button
                type="button"
                onClick={() => setShowDiag((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {showDiag ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Detalhes técnicos
              </button>
              {showDiag && (
                <div className="mt-2 space-y-2">
                  <pre className="select-all whitespace-pre-wrap break-all rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground">
                    {diagnostic}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-2"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
              )}
            </div>
          )}
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BlockedAccessPage;
