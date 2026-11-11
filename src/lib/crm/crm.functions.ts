import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { DEMO_RECORDS } from "./demo-data";
import { scriptDelete, scriptList, scriptSave } from "./apps-script.server";
import type { DataMode, Opportunity, OpportunitiesPayload } from "./model";

const dateField = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Fecha inválida");
const text = (max: number) => z.string().trim().max(max);

const opportunitySchema = z.object({
  id: z.string().trim().max(50).optional(),
  cliente: z.string().trim().min(1, "El cliente es obligatorio").max(200),
  nit: text(50),
  region: text(100),
  ciudad: text(100),
  canal: text(100),
  asignado: text(100),
  monto: z.number().min(0).max(1e13),
  estado: text(60),
  fechaCreacion: dateField,
  fechaCierre: dateField,
  categoria: text(100),
  producto: text(200),
  proximoContacto: dateField,
  ultimaGestion: dateField,
  notas: text(5000),
});

function scriptUrl(): string | undefined {
  const url = process.env["APPS_SCRIPT_URL"]?.trim();
  return url ? url : undefined;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido al contactar Apps Script.";
}

export const listOpportunities = createServerFn({ method: "GET" }).handler(
  async (): Promise<OpportunitiesPayload> => {
    const url = scriptUrl();
    if (!url) return { mode: "demo", records: DEMO_RECORDS, error: null };
    try {
      return { mode: "live", records: await scriptList(url), error: null };
    } catch (error) {
      console.error("Apps Script list failed:", error);
      return { mode: "error", records: [], error: message(error) };
    }
  },
);

export const saveOpportunity = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => opportunitySchema.parse(data))
  .handler(async ({ data }): Promise<{ mode: DataMode; record: Opportunity }> => {
    const url = scriptUrl();
    if (!url) return { mode: "demo", record: { ...data, id: data.id ?? "" } };
    try {
      return { mode: "live", record: await scriptSave(url, data) };
    } catch (error) {
      console.error("Apps Script save failed:", error);
      throw new Error(message(error));
    }
  });

export const deleteOpportunity = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().trim().min(1).max(50) }).parse(data))
  .handler(async ({ data }): Promise<{ mode: DataMode; id: string }> => {
    const url = scriptUrl();
    if (!url) return { mode: "demo", id: data.id };
    try {
      await scriptDelete(url, data.id);
      return { mode: "live", id: data.id };
    } catch (error) {
      console.error("Apps Script delete failed:", error);
      throw new Error(message(error));
    }
  });
