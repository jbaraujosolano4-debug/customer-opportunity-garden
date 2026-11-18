import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  scriptLogin,
  scriptListUsers,
  scriptSaveUser,
  scriptDeleteUser,
} from "./apps-script.server";
import { DEMO_ADMIN, loginSchema, userSchema, type CrmUser } from "./auth-model";

import { getScriptUrl } from "./script-url";

function scriptUrl(): string | undefined {
  return getScriptUrl();
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido al procesar autenticación.";
}

// Memoria demo para cuando no hay APPS_SCRIPT_URL
let inMemoryUsers: CrmUser[] = [DEMO_ADMIN];

export const loginServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }): Promise<CrmUser> => {
    const url = scriptUrl();
    if (!url) {
      if (data.email.toLowerCase() === "admin@crm.com" && data.password === "admin123") {
        return DEMO_ADMIN;
      }
      const found = inMemoryUsers.find(
        (u) => u.email.toLowerCase() === data.email.toLowerCase(),
      );
      if (found && data.password === "admin123") {
        if (found.estado !== "ACTIVO") throw new Error("Usuario inactivo.");
        return found;
      }
      throw new Error("Credenciales inválidas (Modo Demo: admin@crm.com / admin123)");
    }

    try {
      return await scriptLogin(url, data.email, data.password);
    } catch (error) {
      console.error("Login failed:", error);
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
          u.id === data.id ? { ...u, ...data, id: u.id } : u,
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
