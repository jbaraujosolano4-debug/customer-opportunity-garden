// Server-only: talks to the Google Apps Script web app that fronts the sheet.
import { normalizeRecord, type Opportunity, type OpportunityInput } from "./model";
import type { CrmUser, UserInput } from "./auth-model";

type ScriptResponse = {
  ok: boolean;
  error?: string;
  records?: unknown[];
  record?: unknown;
  id?: unknown;
  user?: unknown;
  users?: unknown[];
  result?: unknown;
};

async function readJson(res: Response): Promise<ScriptResponse> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Apps Script respondió con estado ${res.status}.`);
  }
  let json: ScriptResponse;
  try {
    json = JSON.parse(text) as ScriptResponse;
  } catch {
    throw new Error(
      'Apps Script no devolvió datos válidos. Revisa que la implementación sea "Aplicación web" con acceso para "Cualquier persona".',
    );
  }
  if (!json.ok) {
    const err = json.error || "Apps Script devolvió un error.";
    if (
      err.toLowerCase().includes("permiso") ||
      err.toLowerCase().includes("permission") ||
      err.toLowerCase().includes("documento solicitado") ||
      err.toLowerCase().includes("requested document")
    ) {
      throw new Error(
        "Permiso denegado en Google Sheets: En Apps Script, ve a Implementar > Gestionar implementaciones > Editar, y asegúrate de que 'Ejecutar como' esté configurado en 'Yo' (tu cuenta) y acceso en 'Cualquier persona'.",
      );
    }
    throw new Error(err);
  }
  return json;
}

export async function scriptList(url: string): Promise<Opportunity[]> {
  const sep = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${sep}action=list`, { redirect: "follow" });
  const json = await readJson(res);
  return (json.records ?? [])
    .map((r) => normalizeRecord((r ?? {}) as Record<string, unknown>))
    .filter((r) => r.id || r.cliente);
}

async function scriptPost(url: string, payload: unknown): Promise<ScriptResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow",
  });
  return readJson(res);
}

export async function scriptSave(url: string, record: OpportunityInput): Promise<Opportunity> {
  const json = await scriptPost(url, { action: record.id ? "update" : "create", record });
  return normalizeRecord((json.record ?? {}) as Record<string, unknown>);
}

export async function scriptDelete(url: string, id: string): Promise<void> {
  await scriptPost(url, { action: "delete", id });
}

// ==========================================
// MÉTODOS DE USUARIOS Y AUTENTICACIÓN
// ==========================================

export async function scriptLogin(url: string, email: string, password: string): Promise<CrmUser> {
  const json = await scriptPost(url, { action: "login", email, password });
  return json.user as CrmUser;
}

export async function scriptListUsers(url: string): Promise<CrmUser[]> {
  const sep = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${sep}action=listUsers`, { redirect: "follow" });
  const json = await readJson(res);
  return (json.users ?? []) as CrmUser[];
}

export async function scriptSaveUser(url: string, user: UserInput): Promise<CrmUser> {
  const json = await scriptPost(url, {
    action: user.id ? "updateUser" : "createUser",
    user,
  });
  return json.user as CrmUser;
}

export async function scriptDeleteUser(url: string, id: string): Promise<void> {
  await scriptPost(url, { action: "deleteUser", id });
}

export async function scriptResetPassword(
  url: string,
  email: string,
  newPassword: string,
): Promise<void> {
  try {
    const json = await scriptPost(url, { action: "resetPassword", email, newPassword });
    if (json.ok) return;
  } catch {
    // Si la acción resetPassword aún no está en el despliegue de Apps Script,
    // usamos fallback vía listUsers y updateUser:
  }

  const users = await scriptListUsers(url);
  const found = users.find((u) => u.email.trim().toLowerCase() === email.trim().toLowerCase());
  if (!found) {
    throw new Error(`No existe ningún usuario registrado con el correo "${email}".`);
  }
  await scriptSaveUser(url, {
    id: found.id,
    nombre: found.nombre,
    email: found.email,
    telefono: found.telefono || "",
    password: newPassword,
    rol: found.rol,
    estado: found.estado,
  });
}

export type WhatsAppAlertItem = {
  advisor: string;
  phone: string;
  clientsCount: number;
  status: string;
  messagePreview: string;
};

export type WhatsAppAlertResponse = {
  totalScheduled: number;
  date: string;
  results: WhatsAppAlertItem[];
};

export async function scriptSendWhatsAppAlerts(
  url: string,
  options: Record<string, unknown> = {},
): Promise<WhatsAppAlertResponse> {
  const json = await scriptPost(url, { action: "sendWhatsAppAlerts", options });
  return json.result as WhatsAppAlertResponse;
}

export async function scriptSetupWhatsAppTrigger(url: string): Promise<string> {
  const json = await scriptPost(url, { action: "setupWhatsAppTrigger" });
  return json.result as string;
}
