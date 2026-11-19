import { z } from "zod";

export type UserRole = "ADMIN" | "ASESOR";
export type UserStatus = "ACTIVO" | "INACTIVO";

export type CrmUser = {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  estado: UserStatus;
  fechaCreacion?: string;
};

export const loginSchema = z.object({
  email: z.string().trim().email("Ingresa un correo electrónico válido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const registerSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().trim().email("Ingresa un correo electrónico válido"),
  password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email("Ingresa un correo electrónico válido"),
  newPassword: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
});

export const userSchema = z.object({
  id: z.string().trim().optional(),
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().trim().email("Ingresa un correo electrónico válido"),
  password: z.string().optional(),
  rol: z.enum(["ADMIN", "ASESOR"]).default("ASESOR"),
  estado: z.enum(["ACTIVO", "INACTIVO"]).default("ACTIVO"),
  fechaCreacion: z.string().optional(),
});

export type UserInput = z.infer<typeof userSchema>;

export const DEMO_ADMIN: CrmUser = {
  id: "1",
  nombre: "Administrador",
  email: "admin@crm.com",
  rol: "ADMIN",
  estado: "ACTIVO",
  fechaCreacion: "2026-01-01",
};
