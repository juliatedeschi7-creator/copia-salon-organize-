// ===== ROLES =====
export type AppRole = "admin" | "dono" | "funcionario" | "cliente";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
}

// ===== SALON =====
export interface SalonSettings {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  logoUrl?: string;
  clientLink: string;
  primaryColor: string;
  accentColor: string;
  notificationsEnabled: boolean;
  workingHours: WorkingHours[];
}

export interface WorkingHours {
  day: string;
  enabled: boolean;
  open: string;
  close: string;
}

// ===== CLIENTS =====
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate?: string;
  notes?: string;
  createdAt: string;
}

// ===== APPOINTMENTS =====
export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  date: string;
  time: string;
  duration: number;
  status: "agendado" | "confirmado" | "concluido" | "cancelado";
  value: number;
  notes?: string;
}

// ===== SERVICES =====
export interface Service {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
}

// ===== INVENTORY =====
export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: "un" | "ml" | "g";
  minAlert: number;
  costPrice: number;
}

// ===== ANAMNESIS =====
export interface AnamnesisForm {
  id: string;
  type: "manicure" | "cabelo" | "estetica";
  version: number;
  questions: AnamnesisQuestion[];
  updatedAt: string;
}

export interface AnamnesisQuestion {
  id: string;
  text: string;
  type: "text" | "boolean" | "select";
  options?: string[];
}

export interface AnamnesisAnswer {
  id: string;
  formId: string;
  clientId: string;
  formVersion: number;
  answers: Record<string, string | boolean>;
  answeredAt: string;
}
