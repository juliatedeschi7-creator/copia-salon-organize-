import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, X, Pencil, Trash2, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  client_user_id: string;
  service_id: string;
  salon_id: string;
  created_at: string;
  service_name?: string;
  client_name?: string;
  whatsapp_code?: string;
  whatsapp_confirmed_at?: string | null;
}

const statusMap: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  aprovado: { label: "Aprovado", className: "bg-primary/15 text-primary border-primary/30" },
  recusado: { label: "Recusado", className: "bg-destructive/15 text-destructive border-destructive/30" },
  cancelado: { label: "Cancelado", className: "bg-muted text-muted-foreground border-border" },
  concluido: { label: "Concluído", className: "bg-green-500/15 text-green-700 border-green-500/30" },
};

interface AppointmentCardProps {
  appointment: Appointment;
  showDate?: boolean;
  onApprove?: (a: Appointment) => void;
  onReject?: (a: Appointment) => void;
  onComplete?: (a: Appointment) => void;
  onEdit?: (a: Appointment) => void;
  onDelete?: (a: Appointment) => void;
  onConfirmWhatsApp?: (a: Appointment) => void;
}

const AppointmentCard = ({ appointment: a, showDate, onApprove, onReject, onComplete, onEdit, onDelete, onConfirmWhatsApp }: AppointmentCardProps) => {
  const whatsappConfirmed = !!a.whatsapp_confirmed_at;

  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div className="flex items-center gap-3 min-w-0">
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
        {showDate && (
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {format(new Date(a.appointment_date + "T00:00:00"), "dd/MM", { locale: ptBR })}
          </span>
        )}
        <span className="text-sm font-bold text-primary whitespace-nowrap">{a.start_time?.slice(0, 5)}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{a.client_name}</p>
          <p className="text-xs text-muted-foreground truncate">{a.service_name}</p>
          {a.status === "pendente" && a.whatsapp_code && (
            <p className="text-xs text-muted-foreground">
              Código: <span className="font-mono font-semibold tracking-wider">{a.whatsapp_code}</span>
              {whatsappConfirmed && <span className="ml-1 text-green-600">✓ confirmado</span>}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        {a.status === "pendente" && !whatsappConfirmed && onConfirmWhatsApp && (
          <Button size="sm" variant="outline" className="gap-1 text-green-600 hover:bg-green-50 h-8 px-2" onClick={() => onConfirmWhatsApp(a)}>
            <MessageCircle className="h-3 w-3" /> Confirmar WhatsApp
          </Button>
        )}
        {a.status === "pendente" && onApprove && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-green-600 hover:bg-green-50 h-8 px-2 disabled:opacity-40"
            onClick={() => onApprove(a)}
            disabled={!whatsappConfirmed}
            title={!whatsappConfirmed ? "Confirme o WhatsApp antes de aprovar" : undefined}
          >
            <Check className="h-3 w-3" /> Aprovar
          </Button>
        )}
        {a.status === "pendente" && onReject && (
          <Button size="sm" variant="outline" className="gap-1 text-destructive hover:bg-destructive/10 h-8 px-2" onClick={() => onReject(a)}>
            <X className="h-3 w-3" /> Recusar
          </Button>
        )}
        {a.status === "aprovado" && onComplete && (
          <Button size="sm" variant="outline" className="gap-1 text-green-600 hover:bg-green-50 h-8 px-2" onClick={() => onComplete(a)}>
            <Check className="h-3 w-3" /> Concluir
          </Button>
        )}
        {onEdit && (
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onEdit(a)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {onDelete && (
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(a)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <Badge variant="outline" className={statusMap[a.status]?.className}>
          {statusMap[a.status]?.label}
        </Badge>
      </div>
    </div>
  );
};

export default AppointmentCard;
