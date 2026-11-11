import { describe, expect, it } from "vitest";

import { emptyOpportunity, type Opportunity } from "./model";
import { EMPTY_FILTERS, buildReport, formatPercent } from "./report";

const rec = (p: Partial<Opportunity>): Opportunity => ({ ...emptyOpportunity("2026-11-01"), id: "1", ...p });

const records = [
  rec({ id: "1", asignado: "ANA", region: "CARIBE", monto: 1_000_000, estado: "CERRADO", fechaCreacion: "2026-10-01" }),
  rec({ id: "2", asignado: "Ana", region: "Caribe", monto: 3_000_000, estado: "CITA", fechaCreacion: "2026-11-05", proximoContacto: "2026-11-09" }),
  rec({ id: "3", asignado: "LUIS", region: "ANDINA", monto: 4_000_000, estado: "CERRADO", fechaCreacion: "2026-11-08", proximoContacto: "2026-11-01" }),
];

describe("Informe comercial", () => {
  it("counts only CERRADO as closed and computes the close rate over all opportunities", () => {
    const r = buildReport(records, EMPTY_FILTERS, "2026-11-10");
    expect(r.total).toBe(8_000_000);
    expect(r.closedCount).toBe(2);
    expect(r.closedValue).toBe(5_000_000);
    expect(r.openValue).toBe(3_000_000);
    expect(r.closeRate).toBeCloseTo(2 / 3);
    expect(formatPercent(r.closeRate)).toBe("66,7 %");
  });

  it("filters the period by creation date, inclusive on both ends", () => {
    const r = buildReport(records, { ...EMPTY_FILTERS, desde: "2026-11-05", hasta: "2026-11-08" }, "2026-11-10");
    expect(r.records.map((x) => x.id)).toEqual(["2", "3"]);
  });

  it("groups advisors regardless of capitalization", () => {
    const r = buildReport(records, EMPTY_FILTERS, "2026-11-10");
    expect(r.byAdvisor.map((a) => [a.label, a.count])).toEqual([["Ana", 2], ["Luis", 1]]);
  });

  it("lists overdue follow-ups only for opportunities that are not closed", () => {
    const r = buildReport(records, EMPTY_FILTERS, "2026-11-10");
    expect(r.overdue.map((x) => x.id)).toEqual(["2"]);
  });
});
