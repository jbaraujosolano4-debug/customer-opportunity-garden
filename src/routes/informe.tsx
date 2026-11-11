import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FileSpreadsheet, Printer, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataNotice } from "@/components/crm/DataNotice";
import { PageHeader } from "@/components/crm/PageHeader";
import { StageBadge } from "@/components/crm/StageBadge";
import { cn } from "@/lib/utils";
import {
  TONE_CLASSES,
  formatCOP,
  formatDate,
  formatLongToday,
  pretty,
  relativeDay,
  todayISO,
  uniqueValues,
  type Opportunity,
} from "@/lib/crm/model";
import { EMPTY_FILTERS, buildReport, formatPercent, type GroupRow, type Report, type ReportFilters } from "@/lib/crm/report";
import { opportunitiesQuery } from "@/lib/crm/queries";

export const Route = createFileRoute("/informe")({
  head: () => ({
    meta: [
      { title: "Informe | CRM Comercial" },
      { name: "description", content: "Genera y descarga un informe comercial por periodo, asesor, región y categoría." },
      { property: "og:title", content: "Informe | CRM Comercial" },
      { property: "og:description", content: "Genera y descarga un informe comercial listo para presentar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opportunitiesQuery),
  component: ReportPage,
});

const ALL = "__all";

function ReportPage() {
  const { data } = useSuspenseQuery(opportunitiesQuery);
  const records = data.records;
  const today = todayISO();

  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS);
  const [showDetail, setShowDetail] = useState(true);
  const set = (key: keyof ReportFilters) => (value: string) =>
    setFilters((f) => ({ ...f, [key]: value === ALL ? "" : value }));

  const report = useMemo(() => buildReport(records, filters, today), [records, filters, today]);
  const asesores = uniqueValues(records, "asignado");
  const regiones = uniqueValues(records, "region");
  const categorias = uniqueValues(records, "categoria");
  const hasFilters = Object.values(filters).some(Boolean);

  const print = () => {
    // The browser uses the page title as the suggested PDF file name.
    const previous = document.title;
    document.title = `Informe comercial ${today}`;
    const restore = () => {
      document.title = previous;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  return (
    <div className="space-y-5 animate-rise">
      <div className="space-y-5 print:hidden">
        <PageHeader
          title="Informe"
          subtitle="Elige el periodo y los filtros, revisa la vista previa y descárgalo."
          actions={
            <>
              <Button variant="outline" size="sm" className="h-9" onClick={() => downloadReportCsv(report, filters, today)}>
                <FileSpreadsheet /> Descargar Excel
              </Button>
              <Button size="sm" className="h-9" onClick={print}>
                <Printer /> Descargar PDF
              </Button>
            </>
          }
        />
        <DataNotice data={data} />

        <div className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:items-end">
            <Field label="Creadas desde">
              <Input type="date" value={filters.desde} max={filters.hasta || undefined} onChange={(e) => set("desde")(e.target.value)} className="h-10" />
            </Field>
            <Field label="Hasta">
              <Input type="date" value={filters.hasta} min={filters.desde || undefined} onChange={(e) => set("hasta")(e.target.value)} className="h-10" />
            </Field>
            <Field label="Asesor">
              <Filter value={filters.asesor} onChange={set("asesor")} options={asesores} />
            </Field>
            <Field label="Región">
              <Filter value={filters.region} onChange={set("region")} options={regiones} />
            </Field>
            <Field label="Categoría">
              <Filter value={filters.categoria} onChange={set("categoria")} options={categorias} />
            </Field>
            <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
              <label className="flex h-10 flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm">
                <input
                  type="checkbox"
                  checked={showDetail}
                  onChange={(e) => setShowDetail(e.target.checked)}
                  className="size-4 accent-primary"
                />
                Incluir detalle
              </label>
              {hasFilters && (
                <Button variant="ghost" size="icon" className="size-10 text-muted-foreground" onClick={() => setFilters(EMPTY_FILTERS)} aria-label="Limpiar filtros">
                  <X />
                </Button>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          “Descargar PDF” abre la ventana de impresión: elige <strong>Guardar como PDF</strong> como destino.
        </p>
      </div>

      <ReportDocument report={report} filters={filters} today={today} showDetail={showDetail} />
    </div>
  );
}

function ReportDocument({ report, filters, today, showDetail }: { report: Report; filters: ReportFilters; today: string; showDetail: boolean }) {
  const maxStage = Math.max(1, ...report.byStage.map((s) => s.value));
  const followUps = [...report.overdue, ...report.dueToday];

  return (
    <article className="report-sheet rounded-2xl border bg-card p-5 shadow-card sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-base font-extrabold text-primary-foreground">C</span>
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Informe comercial</h2>
            <p className="text-sm text-muted-foreground">Generado el {formatLongToday(today)}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:text-right">
          <dt className="text-muted-foreground sm:col-span-1">Periodo</dt>
          <dd className="font-semibold">{periodLabel(filters)}</dd>
          <dt className="text-muted-foreground">Asesor</dt>
          <dd className="font-semibold">{pretty(filters.asesor) || "Todos"}</dd>
          <dt className="text-muted-foreground">Región</dt>
          <dd className="font-semibold">{pretty(filters.region) || "Todas"}</dd>
          <dt className="text-muted-foreground">Categoría</dt>
          <dd className="font-semibold">{pretty(filters.categoria) || "Todas"}</dd>
        </dl>
      </header>

      {report.count === 0 ? (
        <p className="mt-6 rounded-xl bg-surface p-6 text-center text-sm text-muted-foreground">
          No hay oportunidades para estos filtros. Cambia el periodo o los filtros.
        </p>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 print:grid-cols-3">
            <Metric label="Valor total" value={formatCOP(report.total)} detail={`${report.count} oportunidades`} />
            <Metric label="En gestión" value={formatCOP(report.openValue)} detail={`${report.openCount} abiertas`} />
            <Metric label="Cerradas" value={formatCOP(report.closedValue)} detail={`${report.closedCount} negocios`} />
            <Metric label="Tasa de cierre" value={formatPercent(report.closeRate)} detail="Cerradas sobre el total" />
            <Metric label="Ticket promedio" value={formatCOP(report.averageTicket)} detail="Valor por oportunidad" />
            <Metric
              label="Seguimientos pendientes"
              value={String(followUps.length)}
              detail={`${report.overdue.length} vencidos · ${report.dueToday.length} hoy`}
            />
          </section>

          <Section title="Embudo por etapa">
            <table className="w-full text-sm">
              <thead>
                <HeadRow cells={["Etapa", "", "Cant.", "Valor", "% valor"]} />
              </thead>
              <tbody className="divide-y">
                {report.byStage.map(({ stage, count, value, share }) => (
                  <tr key={stage.value} className="break-inside-avoid">
                    <td className="py-2.5 pr-3 font-medium">
                      <span className="flex items-center gap-2">
                        <span className={cn("size-2 rounded-full", TONE_CLASSES[stage.tone].dot)} />
                        {stage.label}
                      </span>
                    </td>
                    <td className="hidden w-[35%] py-2.5 pr-3 sm:table-cell print:table-cell">
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div className={cn("h-full rounded-full", TONE_CLASSES[stage.tone].bar)} style={{ width: `${(value / maxStage) * 100}%` }} />
                      </div>
                    </td>
                    <td className="tabular py-2.5 pr-3 text-right">{count}</td>
                    <td className="tabular py-2.5 pr-3 text-right font-semibold">{formatCOP(value)}</td>
                    <td className="tabular py-2.5 text-right text-muted-foreground">{formatPercent(share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <div className="grid gap-x-8 lg:grid-cols-2 print:grid-cols-2">
            <GroupTable title="Por asesor" label="Asesor" rows={report.byAdvisor} />
            <GroupTable title="Por región" label="Región" rows={report.byRegion} />
          </div>
          <GroupTable title="Por categoría" label="Categoría" rows={report.byCategory} />

          <Section title="Seguimientos pendientes">
            {followUps.length === 0 ? (
              <p className="rounded-xl bg-surface p-4 text-sm text-muted-foreground">No hay seguimientos vencidos ni para hoy.</p>
            ) : (
              <OpportunityTable rows={followUps} today={today} followUp />
            )}
          </Section>

          {showDetail && (
            <Section title={`Detalle de oportunidades (${report.count})`} pageBreak>
              <OpportunityTable rows={report.records} today={today} />
            </Section>
          )}
        </>
      )}

      <footer className="mt-8 border-t pt-4 text-xs text-muted-foreground">
        CRM Comercial · Valores en pesos colombianos (COP) · Datos al {formatDate(today)}
      </footer>
    </article>
  );
}

function Section({ title, children, pageBreak }: { title: string; children: ReactNode; pageBreak?: boolean | undefined }) {
  return (
    <section className={cn("mt-8", pageBreak && "print:break-before-page print:mt-0")}>
      <h3 className="mb-3 text-base font-bold">{title}</h3>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function HeadRow({ cells }: { cells: string[] }) {
  return (
    <tr className="border-b text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {cells.map((c, i) => (
        <th key={i} className={cn("pb-2 pr-3 last:pr-0", i > 0 && "text-right", c === "" && "hidden sm:table-cell print:table-cell")}>
          {c}
        </th>
      ))}
    </tr>
  );
}

function GroupTable({ title, label, rows }: { title: string; label: string; rows: GroupRow[] }) {
  return (
    <Section title={title}>
      <table className="w-full text-sm">
        <thead>
          <HeadRow cells={[label, "Cant.", "Cerradas", "Valor", "%"]} />
        </thead>
        <tbody className="divide-y">
          {rows.map((g) => (
            <tr key={g.label} className="break-inside-avoid">
              <td className="py-2.5 pr-3 font-medium">{g.label}</td>
              <td className="tabular py-2.5 pr-3 text-right">{g.count}</td>
              <td className="tabular py-2.5 pr-3 text-right">{g.closed}</td>
              <td className="tabular py-2.5 pr-3 text-right font-semibold">{formatCOP(g.value)}</td>
              <td className="tabular py-2.5 text-right text-muted-foreground">{formatPercent(g.share)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function OpportunityTable({ rows, today, followUp }: { rows: Opportunity[]; today: string; followUp?: boolean | undefined }) {
  return (
    <table className="w-full min-w-[640px] text-sm print:min-w-0 print:text-xs">
      <thead>
        <tr className="border-b text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <th className="pb-2 pr-3">ID</th>
          <th className="pb-2 pr-3">Cliente</th>
          <th className="pb-2 pr-3">Asesor</th>
          <th className="pb-2 pr-3">{followUp ? "Próximo contacto" : "Ciudad"}</th>
          <th className="pb-2 pr-3">Estado</th>
          <th className="pb-2 text-right">Monto</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((r) => (
          <tr key={r.id} className="break-inside-avoid align-top">
            <td className="tabular py-2.5 pr-3 text-muted-foreground">{r.id}</td>
            <td className="py-2.5 pr-3">
              <p className="font-semibold">{r.cliente}</p>
              <p className="text-xs text-muted-foreground">
                {[pretty(r.categoria), pretty(r.producto)].filter(Boolean).join(" · ") || "—"}
              </p>
            </td>
            <td className="py-2.5 pr-3">{pretty(r.asignado) || "—"}</td>
            <td className="py-2.5 pr-3">
              {followUp ? (
                <>
                  <p>{formatDate(r.proximoContacto)}</p>
                  <p className="text-xs text-destructive">{relativeDay(r.proximoContacto, today)}</p>
                </>
              ) : (
                pretty(r.ciudad || r.region) || "—"
              )}
            </td>
            <td className="py-2.5 pr-3">
              <StageBadge estado={r.estado} />
            </td>
            <td className="tabular py-2.5 text-right font-semibold">{formatCOP(r.monto)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="break-inside-avoid rounded-xl bg-surface p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="tabular mt-1.5 text-lg font-bold tracking-tight sm:text-xl">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Filter({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value || ALL} onValueChange={onChange}>
      <SelectTrigger className="h-10 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Todos</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {pretty(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function periodLabel(f: ReportFilters): string {
  if (f.desde && f.hasta) return `${formatDate(f.desde)} – ${formatDate(f.hasta)}`;
  if (f.desde) return `Desde ${formatDate(f.desde)}`;
  if (f.hasta) return `Hasta ${formatDate(f.hasta)}`;
  return "Todo el historial";
}

function downloadReportCsv(report: Report, filters: ReportFilters, today: string) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const line = (...cells: unknown[]) => cells.map(esc).join(";");
  const group = (title: string, rows: GroupRow[]) => [
    line(title),
    line("Nombre", "Cantidad", "Cerradas", "Valor", "% valor"),
    ...rows.map((g) => line(g.label, g.count, g.closed, Math.round(g.value), formatPercent(g.share))),
    "",
  ];
  const lines = [
    line("Informe comercial"),
    line("Generado", formatDate(today)),
    line("Periodo", periodLabel(filters)),
    line("Asesor", pretty(filters.asesor) || "Todos"),
    line("Región", pretty(filters.region) || "Todas"),
    line("Categoría", pretty(filters.categoria) || "Todas"),
    "",
    line("Indicador", "Valor"),
    line("Valor total", Math.round(report.total)),
    line("Oportunidades", report.count),
    line("En gestión", Math.round(report.openValue)),
    line("Cerradas (valor)", Math.round(report.closedValue)),
    line("Cerradas (cantidad)", report.closedCount),
    line("Tasa de cierre", formatPercent(report.closeRate)),
    line("Ticket promedio", Math.round(report.averageTicket)),
    line("Seguimientos vencidos", report.overdue.length),
    "",
    line("Por etapa"),
    line("Etapa", "Cantidad", "Valor", "% valor"),
    ...report.byStage.map((s) => line(s.stage.label, s.count, Math.round(s.value), formatPercent(s.share))),
    "",
    ...group("Por asesor", report.byAdvisor),
    ...group("Por región", report.byRegion),
    ...group("Por categoría", report.byCategory),
    line("Detalle de oportunidades"),
    line("ID", "Cliente", "NIT", "Región", "Ciudad", "Canal", "Asignado a", "Monto", "Estado", "Fecha de creación", "Fecha de cierre", "Categoría", "Producto", "Próximo contacto", "Última gestión", "Notas"),
    ...report.records.map((r) =>
      line(r.id, r.cliente, r.nit, r.region, r.ciudad, r.canal, r.asignado, Math.round(r.monto), r.estado, r.fechaCreacion, r.fechaCierre, r.categoria, r.producto, r.proximoContacto, r.ultimaGestion, r.notas),
    ),
  ];
  // "sep=;" plus a BOM makes Excel (Spanish locale) open the file in columns with accents intact.
  const blob = new Blob(["\ufeffsep=;\n" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `informe-comercial-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
