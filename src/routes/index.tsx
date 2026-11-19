import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowUpRight, Briefcase, CircleDollarSign, Shield, Trophy, User } from "lucide-react";

import { DataNotice } from "@/components/crm/DataNotice";
import { FollowUpChip } from "@/components/crm/FollowUpChip";
import { PageHeader } from "@/components/crm/PageHeader";
import { StageBadge } from "@/components/crm/StageBadge";
import { useCrmDialog } from "@/components/crm/crm-dialog-context";
import { cn } from "@/lib/utils";
import {
  TONE_CLASSES,
  followUpStatus,
  formatCOP,
  formatCompactCOP,
  formatLongToday,
  pretty,
  stageInfo,
  stagesFor,
  todayISO,
  uniqueValues,
} from "@/lib/crm/model";
import { opportunitiesQuery, useFilteredOpportunities } from "@/lib/crm/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Resumen | CRM Comercial" },
      { name: "description", content: "Resumen comercial: valor en cartera, etapas, categorías y seguimientos pendientes." },
      { property: "og:title", content: "Resumen | CRM Comercial" },
      { property: "og:description", content: "Resumen comercial: valor en cartera, etapas, categorías y seguimientos pendientes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opportunitiesQuery),
  component: Dashboard,
});

function Dashboard() {
  const [selectedAdvisor, setSelectedAdvisor] = useState("__all");
  const { records, allRecords, mode, error, isAdmin, user } = useFilteredOpportunities(selectedAdvisor);
  const { openEdit } = useCrmDialog();
  const today = todayISO();

  const total = records.reduce((s, r) => s + r.monto, 0);
  const closed = records.filter((r) => stageInfo(r.estado).value === "CERRADO");
  const closedValue = closed.reduce((s, r) => s + r.monto, 0);
  const open = records.filter((r) => stageInfo(r.estado).value !== "CERRADO");
  const openValue = open.reduce((s, r) => s + r.monto, 0);
  const overdue = records.filter((r) => followUpStatus(r.proximoContacto, today) === "overdue");
  const dueToday = records.filter((r) => followUpStatus(r.proximoContacto, today) === "today");

  const byStage = stagesFor(records).map((stage) => {
    const items = records.filter((r) => stageInfo(r.estado).value === stage.value);
    return { stage, count: items.length, value: items.reduce((s, r) => s + r.monto, 0) };
  });
  const maxStage = Math.max(1, ...byStage.map((s) => s.value));

  const group = (key: (r: (typeof records)[number]) => string) => {
    const map = new Map<string, { label: string; count: number; value: number }>();
    for (const r of records) {
      const label = pretty(key(r)) || "Sin definir";
      const g = map.get(label) ?? { label, count: 0, value: 0 };
      g.count += 1;
      g.value += r.monto;
      map.set(label, g);
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  };
  const byCategory = group((r) => r.categoria || r.producto);
  const maxCategory = Math.max(1, ...byCategory.map((c) => c.value));

  // Para el admin: desglose consolidado de todos los asesores
  // Para el asesor: solo su propio perfil
  const byAdvisor = isAdmin
    ? (() => {
        const map = new Map<string, { label: string; count: number; value: number }>();
        for (const r of allRecords) {
          const label = pretty(r.asignado) || "Sin asignar";
          const g = map.get(label) ?? { label, count: 0, value: 0 };
          g.count += 1;
          g.value += r.monto;
          map.set(label, g);
        }
        return [...map.values()].sort((a, b) => b.value - a.value);
      })()
    : [
        {
          label: user?.nombre || "Tú",
          count: records.length,
          value: total,
        },
      ];

  const upcoming = records
    .filter((r) => r.proximoContacto)
    .sort((a, b) => a.proximoContacto.localeCompare(b.proximoContacto))
    .slice(0, 6);
  const recent = [...records].sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion)).slice(0, 5);

  const advisorList = uniqueValues(allRecords, "asignado");

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Resumen comercial"
          subtitle={
            isAdmin
              ? `${formatLongToday(today)} · Vista Consolidada General`
              : `${formatLongToday(today)} · Cartera personal: ${user?.nombre || "Asesor"}`
          }
        />
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
              <Shield className="size-3.5" /> Consolidado Administrativo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              <User className="size-3.5" /> Mi Cartera
            </span>
          )}
        </div>
      </div>

      <DataNotice data={{ mode, records, error }} />

      {/* Selector de filtros solo para el Administrador */}
      {isAdmin && advisorList.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="font-semibold text-muted-foreground whitespace-nowrap pr-1">Filtrar vista:</span>
          <button
            onClick={() => setSelectedAdvisor("__all")}
            className={cn(
              "rounded-lg px-3 py-1 font-medium transition-colors",
              selectedAdvisor === "__all"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            Consolidado ({allRecords.length})
          </button>
          {advisorList.map((adv) => (
            <button
              key={adv}
              onClick={() => setSelectedAdvisor(adv)}
              className={cn(
                "rounded-lg px-3 py-1 font-medium transition-colors whitespace-nowrap",
                selectedAdvisor === adv
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {adv} ({allRecords.filter((r) => r.asignado === adv).length})
            </button>
          ))}
        </div>
      )}

      {/* Tarjetas de KPIs principales */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Kpi
          icon={<CircleDollarSign />}
          label="Valor total"
          value={formatCompactCOP(total)}
          detail={`${records.length} oportunidades`}
        />
        <Kpi
          icon={<Briefcase />}
          label="En gestión"
          value={formatCompactCOP(openValue)}
          detail={`${open.length} abiertas`}
        />
        <Kpi
          icon={<Trophy />}
          label="Cerradas"
          value={formatCompactCOP(closedValue)}
          detail={`${closed.length} negocios`}
        />
        <Kpi
          icon={<AlertCircle />}
          label="Seguimientos"
          value={String(overdue.length + dueToday.length)}
          detail={`${overdue.length} vencidos · ${dueToday.length} hoy`}
          tone={overdue.length ? "alert" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel title="Valor por etapa" className="lg:col-span-3" action={<PanelLink to="/pipeline">Ver pipeline</PanelLink>}>
          {records.length === 0 ? (
            <Empty>Aún no tienes oportunidades registradas en ninguna etapa.</Empty>
          ) : (
            <ul className="space-y-3.5">
              {byStage.map(({ stage, count, value }) => (
                <li key={stage.value}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <span className={cn("size-2 rounded-full", TONE_CLASSES[stage.tone].dot)} />
                      {stage.label}
                      <span className="text-xs font-normal text-muted-foreground">{count}</span>
                    </span>
                    <span className="tabular font-semibold">{formatCOP(value)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn("h-full rounded-full transition-all", TONE_CLASSES[stage.tone].bar)}
                      style={{ width: `${(value / maxStage) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Por categoría" className="lg:col-span-2">
          {byCategory.length === 0 ? (
            <Empty>Aún no hay oportunidades por categoría.</Empty>
          ) : (
            <ul className="space-y-3">
              {byCategory.slice(0, 7).map((c) => (
                <li key={c.label} className="flex items-center gap-3">
                  <span className="w-24 truncate text-sm font-medium">{c.label}</span>
                  <div className="h-7 flex-1 overflow-hidden rounded-md bg-secondary">
                    <div className="h-full rounded-md bg-primary/85" style={{ width: `${(c.value / maxCategory) * 100}%` }} />
                  </div>
                  <span className="tabular w-20 text-right text-xs font-semibold text-muted-foreground">
                    {formatCompactCOP(c.value)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel title="Próximos seguimientos" className="lg:col-span-3" action={<PanelLink to="/seguimientos">Ver todos</PanelLink>}>
          {upcoming.length === 0 ? (
            <Empty>No hay seguimientos agendados para tus clientes.</Empty>
          ) : (
            <ul className="-mx-2 divide-y">
              {upcoming.map((r) => (
                <li key={r.id}>
                  <button onClick={() => openEdit(r)} className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-secondary/60">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.cliente}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[pretty(r.asignado), pretty(r.categoria || r.producto)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <FollowUpChip date={r.proximoContacto} today={today} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={isAdmin ? "Consolidado por asesor" : "Mi perfil"} className="lg:col-span-2">
          {byAdvisor.length === 0 ? (
            <Empty>Sin asesores registrados.</Empty>
          ) : (
            <ul className="space-y-3">
              {byAdvisor.map((a) => (
                <li key={a.label} className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {initials(a.label)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.count} oportunidades</p>
                  </div>
                  <span className="tabular text-sm font-semibold">{formatCompactCOP(a.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Creadas recientemente" action={<PanelLink to="/oportunidades">Ver todas</PanelLink>}>
        {recent.length === 0 ? (
          <Empty>
            Aún no tienes oportunidades registradas. Haz clic en el botón "+ Nueva oportunidad" para agregar tu primer cliente.
          </Empty>
        ) : (
          <ul className="-mx-2 divide-y">
            {recent.map((r) => (
              <li key={r.id}>
                <button onClick={() => openEdit(r)} className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-secondary/60">
                  <span className="tabular w-8 text-xs text-muted-foreground">#{r.id}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.cliente}</p>
                    <p className="truncate text-xs text-muted-foreground">{pretty(r.ciudad || r.region)}</p>
                  </div>
                  <StageBadge estado={r.estado} className="hidden sm:inline-flex" />
                  <span className="tabular w-28 text-right text-sm font-semibold">{formatCOP(r.monto)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function Kpi({
  icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "alert" | undefined;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</span>
        <span
          className={cn(
            "grid size-8 place-items-center rounded-lg [&_svg]:size-4",
            tone === "alert" ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground",
          )}
        >
          {icon}
        </span>
      </div>
      <p className="tabular mt-3 text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function Panel({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: ReactNode | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-card", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function PanelLink({ to, children }: { to: "/pipeline" | "/seguimientos" | "/oportunidades"; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-0.5 text-sm font-semibold text-accent-foreground hover:underline">
      {children} <ArrowUpRight className="size-3.5" />
    </Link>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-surface p-4 text-sm text-muted-foreground text-center py-6">{children}</p>;
}
