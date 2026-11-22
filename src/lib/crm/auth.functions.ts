import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  scriptLogin,
  scriptListUsers,
  scriptSaveUser,
  scriptDeleteUser,
  scriptResetPassword,
} from "./apps-script.server";
import {
  DEMO_ADMIN,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  userSchema,
  type CrmUser,
} from "./auth-model";

import { getScriptUrl } from "./script-url";

function scriptUrl(): string {
  return getScriptUrl();
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido al procesar autenticación.";
}

// Memoria demo para cuando no hay APPS_SCRIPT_URL
let inMemoryUsers: CrmUser[] = [DEMO_ADMIN];

// ==========================================
// CONTROL DE INTENTOS Y SEGURIDAD (MÁXIMO 5)
// ==========================================
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const LOCKOUT_DURATION_MS = LOCKOUT_MINUTES * 60 * 1000;

type AttemptRecord = {
  attempts: number;
  lockedUntil: number | null;
};

const loginAttempts = new Map<string, AttemptRecord>();

function getAttemptRecord(email: string): AttemptRecord {
  const record = loginAttempts.get(email);
  if (!record) {
    const fresh: AttemptRecord = { attempts: 0, lockedUntil: null };
    loginAttempts.set(email, fresh);
    return fresh;
  }
  if (record.lockedUntil && Date.now() > record.lockedUntil) {
    record.attempts = 0;
    record.lockedUntil = null;
  }
  return record;
}

function clearAttemptRecord(email: string) {
  loginAttempts.delete(email);
}

export const loginServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }): Promise<CrmUser> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const record = getAttemptRecord(cleanEmail);

    // Verificar si la cuenta está actualmente bloqueada
    if (record.lockedUntil && Date.now() < record.lockedUntil) {
      const remainingMinutes = Math.ceil((record.lockedUntil - Date.now()) / 60000);
      throw new Error(
        `Acceso bloqueado por seguridad: has superado los ${MAX_LOGIN_ATTEMPTS} intentos fallidos permitidos. Intenta de nuevo en ${remainingMinutes} minuto(s) o utiliza '¿Olvidaste tu contraseña?'.`,
      );
    }

    const url = scriptUrl();
    try {
      const user = await scriptLogin(url, cleanEmail, data.password);
      // Éxito: restablecer intentos fallidos a 0
      clearAttemptRecord(cleanEmail);
      return user;
    } catch (error) {
      console.error("Login failed:", error);

      // Registrar intento fallido
      record.attempts += 1;
      if (record.attempts >= MAX_LOGIN_ATTEMPTS) {
        record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
        throw new Error(
          `Has superado el límite máximo de ${MAX_LOGIN_ATTEMPTS} intentos de ingreso. Por seguridad, el acceso ha sido bloqueado durante ${LOCKOUT_MINUTES} minutos.`,
        );
      }

      const remaining = MAX_LOGIN_ATTEMPTS - record.attempts;
      throw new Error(
        `Credenciales incorrectas. Te ${remaining === 1 ? "queda" : "quedan"} ${remaining} ${remaining === 1 ? "intento" : "intentos"} antes del bloqueo de seguridad.`,
      );
    }
  });

export const registerServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => registerSchema.parse(data))
  .handler(async ({ data }): Promise<CrmUser> => {
    const url = scriptUrl();
    const cleanEmail = data.email.trim().toLowerCase();

    try {
      const users = await scriptListUsers(url);
      if (users.some((u) => u.email.trim().toLowerCase() === cleanEmail)) {
        throw new Error("Ya existe un usuario registrado con este correo electrónico.");
      }

      const created = await scriptSaveUser(url, {
        nombre: data.nombre.trim(),
        email: cleanEmail,
        password: data.password,
        rol: "ASESOR",
        estado: "ACTIVO",
      });
      return created;
    } catch (error) {
      console.error("Register user failed:", error);
      throw new Error(message(error));
    }
  });

export const resetPasswordServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => resetPasswordSchema.parse(data))
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    const url = scriptUrl();
    const cleanEmail = data.email.trim().toLowerCase();
    try {
      await scriptResetPassword(url, cleanEmail, data.newPassword);
      clearAttemptRecord(cleanEmail);
      return { success: true, message: "Contraseña restablecida exitosamente. Tu cuenta ha sido desbloqueada." };
    } catch (error) {
      console.error("Reset password failed:", error);
      throw new Error(message(error));
    }
  });

export const listUsersServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<CrmUser[]> => {
    const url = scriptUrl();
    if (!url) return inMemoryUsers;
    try {
      return await scriptListUsers(url);
    } catch (error) {
      console.error("List users failed:", error);
      throw new Error(message(error));
    }
  },
);

export const saveUserServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => userSchema.parse(data))
  .handler(async ({ data }): Promise<CrmUser> => {
    const url = scriptUrl();
    if (!url) {
      if (data.id) {
        inMemoryUsers = inMemoryUsers.map((u) =>
          u.id === data.id
            ? {
                id: u.id,
                nombre: data.nombre,
                email: data.email,
                rol: data.rol,
                estado: data.estado,
                ...(u.fechaCreacion ? { fechaCreacion: u.fechaCreacion } : {}),
              }
            : u,
        );
        return inMemoryUsers.find((u) => u.id === data.id)!;
      }
      const newUser: CrmUser = {
        id: String(inMemoryUsers.length + 1),
        nombre: data.nombre,
        email: data.email,
        rol: data.rol,
        estado: data.estado,
        fechaCreacion: new Date().toISOString().slice(0, 10),
      };
      inMemoryUsers.push(newUser);
      return newUser;
    }

    try {
      return await scriptSaveUser(url, data);
    } catch (error) {
      console.error("Save user failed:", error);
      throw new Error(message(error));
    }
  });

export const deleteUserServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().trim().min(1) }).parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const url = scriptUrl();
    if (!url) {
      inMemoryUsers = inMemoryUsers.filter((u) => u.id !== data.id);
      return { id: data.id };
    }

    try {
      await scriptDeleteUser(url, data.id);
      return { id: data.id };
    } catch (error) {
      console.error("Delete user failed:", error);
      throw new Error(message(error));
    }
  });
