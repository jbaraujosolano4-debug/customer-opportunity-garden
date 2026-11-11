// Shared, browser-safe CRM model: types, stages, parsing and formatting helpers.

export type Opportunity = {
  id: string;
  cliente: string;
  nit: string;
  region: string;
  ciudad: string;
  canal: string;
  asignado: string;
  monto: number;
  estado: string;
  fechaCreacion: string;
  fechaCierre: string;
  categoria: string;
  producto: string;
  proximoContacto: string;
  ultimaGestion: string;
  notas: string;
};

export type OpportunityInput = Omit<Opportunity, "id"> & { id?: string | undefined };

export type DataMode = "demo" | "live" | "error";

export type OpportunitiesPayload = {
  mode: DataMode;
  records: Opportunity[];
  error: string | null;
};

export const TIME_ZONE = "America/Bogota";

export type StageTone = "stage-1" | "stage-2" | "stage-3" | "stage-4" | "stage-5" | "stage-6" | "neutral";

export type Stage = { value: string; label: string; tone: StageTone };

export const STAGES: Stage[] = [
  { value: "PROSPECCION", label: "Prospección", tone: "stage-1" },
  { value: "CITA", label: "Cita", tone: "stage-2" },
  { value: "CLIENTE NUEVO", label: "Cliente nuevo", tone: "stage-3" },
  { value: "EN PEDIDO", label: "En pedido", tone: "stage-4" },
  { value: "ACTIVO", label: "Activo", tone: "stage-5" },
  { value: "CERRADO", label: "Cerrado", tone: "stage-6" },
];

export const TONE_CLASSES: Record<StageTone, { badge: string; dot: string; bar: string }> = {
  "stage-1": { badge: "bg-stage-1/12 text-stage-1", dot: "bg-stage-1", bar: "bg-stage-1" },
  "stage-2": { badge: "bg-stage-2/15 text-warning-foreground", dot: "bg-stage-2", bar: "bg-stage-2" },
  "stage-3": { badge: "bg-stage-3/12 text-stage-3", dot: "bg-stage-3", bar: "bg-stage-3" },
  "stage-4": { badge: "bg-stage-4/12 text-accent-foreground", dot: "bg-stage-4", bar: "bg-stage-4" },
  "stage-5": { badge: "bg-stage-5/12 text-stage-5", dot: "bg-stage-5", bar: "bg-stage-5" },
  "stage-6": { badge: "bg-stage-6/10 text-stage-6", dot: "bg-stage-6", bar: "bg-stage-6" },
  neutral: { badge: "bg-stage-neutral/10 text-stage-neutral", dot: "bg-stage-neutral", bar: "bg-stage-neutral" },
};

export const DEFAULT_CATEGORIES = ["Soccer", "Running", "Pádel"];

export function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function stageInfo(estado: string): Stage {
  const key = normalizeKey(estado);
  const known = STAGES.find((s) => s.value === key);
  if (known) return known;
  return { value: key, label: key ? pretty(key) : "Sin estado", tone: "neutral" };
}

/** Title-cases values typed in ALL CAPS (e.g. "SANTA MARTA" → "Santa Marta"). */
export function pretty(value: string): string {
  if (!value) return "";
  if (value !== value.toUpperCase()) return value;
  return value.toLowerCase().replace(/(^|[\s\-/])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

export function parseMonto(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/[$\s]/g, "").replace(/COP/i, "");
  if (!cleaned) return 0;
  if (/^\d+([.,]\d{1,2})?$/.test(cleaned)) return Number(cleaned.replace(",", "."));
  const digits = cleaned.replace(/[.,]/g, "");
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

/** Accepts YYYY-MM-DD, ISO timestamps and DD/MM/YYYY; returns YYYY-MM-DD or "". */
export function parseDate(value: unknown): string {
  if (value == null) return "";
  const s = String(value).trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1] ?? ""}-${iso[2] ?? ""}-${iso[3] ?? ""}`;
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3] ?? ""}-${(dmy[2] ?? "").padStart(2, "0")}-${(dmy[1] ?? "").padStart(2, "0")}`;
  return "";
}

const str = (v: unknown) => (v == null ? "" : String(v).trim());

export function normalizeRecord(raw: Record<string, unknown>): Opportunity {
  return {
    id: str(raw["id"]),
    cliente: str(raw["cliente"]),
    nit: str(raw["nit"]),
    region: str(raw["region"]),
    ciudad: str(raw["ciudad"]),
    canal: str(raw["canal"]),
    asignado: str(raw["asignado"]),
    monto: parseMonto(raw["monto"]),
    estado: normalizeKey(str(raw["estado"])),
    fechaCreacion: parseDate(raw["fechaCreacion"]),
    fechaCierre: parseDate(raw["fechaCierre"]),
    categoria: str(raw["categoria"]),
    producto: str(raw["producto"]),
    proximoContacto: parseDate(raw["proximoContacto"]),
    ultimaGestion: parseDate(raw["ultimaGestion"]),
    notas: str(raw["notas"]),
  };
}

function ymd(iso: string): [number, number, number] {
  const [y = 1970, m = 1, d = 1] = iso.split("-").map(Number);
  return [y, m, d];
}

export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = ymd(fromISO);
  const [ty, tm, td] = ymd(toISO);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = ymd(iso);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export type FollowUpStatus = "none" | "overdue" | "today" | "upcoming";

export function followUpStatus(date: string, today: string): FollowUpStatus {
  if (!date) return "none";
  if (date < today) return "overdue";
  if (date === today) return "today";
  return "upcoming";
}

export function relativeDay(date: string, today: string): string {
  if (!date) return "";
  const diff = daysBetween(today, date);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  return diff > 0 ? `En ${diff} días` : `Hace ${-diff} días`;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = ymd(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatLongToday(iso: string): string {
  const [y, m, d] = ymd(iso);
  const names = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${d} de ${names[m - 1]} de ${y}`;
}

export function formatCOP(n: number): string {
  return "$ " + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatCompactCOP(n: number): string {
  const fmt = (v: number) => (Math.round(v * 10) / 10).toString().replace(".", ",");
  if (n >= 1e9) return `$ ${fmt(n / 1e9)} mil M`;
  if (n >= 1e6) return `$ ${fmt(n / 1e6)} M`;
  if (n >= 1e3) return `$ ${fmt(n / 1e3)} mil`;
  return formatCOP(n);
}

export function emptyOpportunity(today: string = todayISO()): OpportunityInput {
  return {
    cliente: "",
    nit: "",
    region: "",
    ciudad: "",
    canal: "",
    asignado: "",
    monto: 0,
    estado: "PROSPECCION",
    fechaCreacion: today,
    fechaCierre: "",
    categoria: "",
    producto: "",
    proximoContacto: "",
    ultimaGestion: "",
    notas: "",
  };
}

export function nextNumericId(records: Opportunity[]): string {
  const max = records.reduce((acc, r) => {
    const n = Number(r.id);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return String(max + 1);
}

/** Stages in pipeline order, followed by any unknown stage values present in the data. */
export function stagesFor(records: Opportunity[]): Stage[] {
  const extra = new Map<string, Stage>();
  for (const r of records) {
    const info = stageInfo(r.estado);
    if (info.tone === "neutral" && !extra.has(info.value)) extra.set(info.value, info);
  }
  return [...STAGES, ...extra.values()];
}

export function uniqueValues(records: Opportunity[], key: keyof Opportunity, extra: string[] = []): string[] {
  const seen = new Map<string, string>();
  for (const v of [...extra, ...records.map((r) => String(r[key] ?? ""))]) {
    const t = v.trim();
    if (!t) continue;
    const k = normalizeKey(t);
    if (!seen.has(k)) seen.set(k, t);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "es"));
}
