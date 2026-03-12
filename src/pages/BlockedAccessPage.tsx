import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldOff, LogOut } from "lucide-react";

interface BlockedAccessPageProps {
  title?: string;
  description?: string;
  message?: string;
}

const BlockedAccessPage = ({
  title = "Acesso bloqueado",
  description = "Seu acesso ao sistema foi bloqueado pelo administrador.",
  message,
}: BlockedAccessPageProps) => {
  const { signOut, profile } = useAuth();

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
