import { AppRole } from "@/types";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Package,
  PackageOpen,
  DollarSign,
  Settings,
  ShieldCheck,
  UserCircle,
  ClipboardList,
  Bell,
  Scissors,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: AppRole[];
}

export const navItems: NavItem[] = [
  {
    label: "Painel",
    path: "/",
    icon: LayoutDashboard,
    roles: ["admin", "dono"],
  },
  {
    label: "Agenda",
    path: "/agenda",
    icon: Calendar,
    roles: ["dono", "funcionario"],
  },
  {
    label: "Serviços",
    path: "/servicos",
    icon: Scissors,
    roles: ["dono"],
  },
  {
    label: "Clientes",
    path: "/clientes",
    icon: Users,
    roles: ["dono"],
  },
  {
    label: "Anamnese",
    path: "/anamnese",
    icon: ClipboardList,
    roles: ["dono"],
  },
  {
    label: "Pacotes",
    path: "/pacotes",
    icon: PackageOpen,
    roles: ["dono"],
  },
  {
    label: "Estoque",
    path: "/estoque",
    icon: Package,
    roles: ["dono"],
  },
  {
    label: "Financeiro",
    path: "/financeiro",
    icon: DollarSign,
    roles: ["dono"],
  },
  {
    label: "Notificações",
    path: "/notificacoes",
    icon: Bell,
    roles: ["dono"],
  },
  {
    label: "Configurações",
    path: "/configuracoes",
    icon: Settings,
    roles: ["dono"],
  },
  {
    label: "Admin",
    path: "/admin",
    icon: ShieldCheck,
    roles: ["admin"],
  },
  {
    label: "Minha Área",
    path: "/cliente-area",
    icon: UserCircle,
    roles: ["cliente"],
  },
  {
    label: "Minha Agenda",
    path: "/minha-agenda",
    icon: Calendar,
    roles: ["cliente", "funcionario"],
  },
];
