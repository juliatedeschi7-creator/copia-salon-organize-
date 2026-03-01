import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";

const PendingApprovalPage = () => {
  const { signOut, profile } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
            <Clock className="h-7 w-7 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Aguardando aprovação</CardTitle>
          <CardDescription>
            Sua conta foi criada com sucesso! O administrador precisa aprovar seu acesso antes que você possa utilizar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              Conta: <span className="font-medium text-foreground">{profile?.email}</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Você será notificado quando sua conta for aprovada. Por enquanto, aguarde a liberação.
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

export default PendingApprovalPage;
