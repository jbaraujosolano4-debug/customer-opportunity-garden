// Pure report builder for the Informe page: filters records and aggregates the figures shown.
import { followUpStatus, normalizeKey, pretty, stageInfo, stagesFor, type Opportunity, type Stage } from "./model";

export type ReportFilters = {
  desde: string; // YYYY-MM-DD on fechaCreacion, "" = no lower bound
  hasta: string; // YYYY-MM-DD on fechaCreacion, "" = no upper bound
  asesor: string; // "" = all
  region: string;
  categoria: string;
};

export const EMPTY_FILTERS: ReportFilters = { desde: "", hasta: "", asesor: "", region: "", categoria: "" };

export type GroupRow = { label: string; count: number; value: number; closed: number; share: number };
export type StageRow = { stage: Stage; count: number; value: number; share: number };

export type Report = {
  records: Opportunity[];
  total: number;
  count: number;
  openCount: number;
  openValue: number;
  closedCount: number;
  closedValue: number;
  /** Closed opportunities / all opportunities in the filtered set, 0–1. */
  closeRate: number;
  averageTicket: number;
  byStage: StageRow[];
  byAdvisor: GroupRow[];
  byRegion: GroupRow[];
  byCategory: GroupRow[];
  overdue: Opportunity[];
  dueToday: Opportunity[];
};

const isClosed = (r: Opportunity) => stageInfo(r.estado).value === "CERRADO";

export function filterRecords(records: Opportunity[], f: ReportFilters): Opportunity[] {
  const eq = (value: string, wanted: string) => !wanted || normalizeKey(value) === normalizeKey(wanted);
  return records.filter((r) => {
    if (f.desde && (!r.fechaCreacion || r.fechaCreacion < f.desde)) return false;
    if (f.hasta && (!r.fechaCreacion || r.fechaCreacion > f.hasta)) return false;
    return eq(r.asignado, f.asesor) && eq(r.region, f.region) && eq(r.categoria, f.categoria);
  });
}

function groupBy(records: Opportunity[], key: (r: Opportunity) => string, total: number): GroupRow[] {
  const map = new Map<string, GroupRow>();
  for (const r of records) {
    const label = pretty(key(r)) || "Sin definir";
    const k = normalizeKey(label);
    const g = map.get(k) ?? { label, count: 0, value: 0, closed: 0, share: 0 };
    g.count += 1;
    g.value += r.monto;
    if (isClosed(r)) g.closed += 1;
    map.set(k, g);
  }
  return [...map.values()]
    .map((g) => ({ ...g, share: total > 0 ? g.value / total : 0 }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "es"));
}

export function buildReport(all: Opportunity[], filters: ReportFilters, today: string): Report {
  const records = filterRecords(all, filters);
  const total = records.reduce((s, r) => s + r.monto, 0);
  const closed = records.filter(isClosed);
  const closedValue = closed.reduce((s, r) => s + r.monto, 0);
  const byStage = stagesFor(records).map((stage) => {
    const items = records.filter((r) => stageInfo(r.estado).value === stage.value);
    const value = items.reduce((s, r) => s + r.monto, 0);
    return { stage, count: items.length, value, share: total > 0 ? value / total : 0 };
  });
  const byFollowUp = (status: "overdue" | "today") =>
    records
      .filter((r) => !isClosed(r) && followUpStatus(r.proximoContacto, today) === status)
      .sort((a, b) => a.proximoContacto.localeCompare(b.proximoContacto));

  return {
    records,
    total,
    count: records.length,
    openCount: records.length - closed.length,
    openValue: total - closedValue,
    closedCount: closed.length,
    closedValue,
    closeRate: records.length > 0 ? closed.length / records.length : 0,
    averageTicket: records.length > 0 ? total / records.length : 0,
    byStage,
    byAdvisor: groupBy(records, (r) => r.asignado, total),
    byRegion: groupBy(records, (r) => r.region, total),
    byCategory: groupBy(records, (r) => r.categoria, total),
    overdue: byFollowUp("overdue"),
    dueToday: byFollowUp("today"),
  };
}

export function formatPercent(ratio: number): string {
  return `${(Math.round(ratio * 1000) / 10).toString().replace(".", ",")} %`;
}
