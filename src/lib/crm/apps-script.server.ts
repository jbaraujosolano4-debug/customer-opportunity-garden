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
  if (!json.ok) throw new Error(json.error || "Apps Script devolvió un error.");
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
