import { describe, expect, it } from "vitest";

import { followUpStatus, normalizeRecord, parseDate, parseMonto, stageInfo } from "./model";

describe("CRM model", () => {
  it("reads COP amounts typed with thousand separators", () => {
    expect(parseMonto("3.000.000")).toBe(3000000);
    expect(parseMonto("$ 1,500,000")).toBe(1500000);
    expect(parseMonto(741000)).toBe(741000);
  });

  it("reads sheet dates in day/month/year order", () => {
    expect(parseDate("06/11/2026")).toBe("2026-11-06");
    expect(parseDate("2026-03-25")).toBe("2026-03-25");
  });

  it("classifies the next contact against today", () => {
    expect(followUpStatus("2026-11-09", "2026-11-10")).toBe("overdue");
    expect(followUpStatus("2026-11-10", "2026-11-10")).toBe("today");
    expect(followUpStatus("2026-11-11", "2026-11-10")).toBe("upcoming");
    expect(followUpStatus("", "2026-11-10")).toBe("none");
  });

  it("matches stage names regardless of accents and case", () => {
    expect(stageInfo("Prospección").value).toBe("PROSPECCION");
    expect(normalizeRecord({ estado: "en pedido" }).estado).toBe("EN PEDIDO");
  });
});
