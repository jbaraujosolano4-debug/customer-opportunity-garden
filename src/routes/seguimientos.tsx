import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PhoneCall } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { DataNotice } from "@/components/crm/DataNotice";
import { FollowUpChip } from "@/components/crm/FollowUpChip";
import { PageHeader } from "@/components/crm/PageHeader";
import { StageBadge } from "@/components/crm/StageBadge";
import { useCrmDialog } from "@/components/crm/crm-dialog-context";
import { cn } from "@/lib/utils";
import {
  addDays,
  followUpStatus,
  formatCOP,
  formatDate,
  pretty,
  relativeDay,
  stageInfo,
  todayISO,
  type Opportunity,
} from "@/lib/crm/model";
import { opportunitiesQuery } from "@/lib/crm/queries";

export const Route = createFileRoute("/seguimientos")({
  head: () => ({
    meta: [
      { title: "Seguimientos | CRM Comercial" },
      { name: "description", content: "Agenda de seguimientos: contactos vencidos, de hoy y próximos con cada cliente." },
      { property: "og:title", content: "Seguimientos | CRM Comercial" },
      { property: "og:description", content: "Agenda de seguimientos con cada cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opportunitiesQuery),
  component: FollowUpsPage,
});

function FollowUpsPage() {
  const { data } = useSuspenseQuery(opportunitiesQuery);
  const today = todayISO();
  const weekEnd = addDays(today, 7);
  const byDate = (a: Opportunity, b: Opportunity) => a.proximoContacto.localeCompare(b.proximoContacto);
  const records = data.records;

  const overdue = records.filter((r) => followUpStatus(r.proximoContacto, today) === "overdue").sort(byDate);
  const dueToday = records.filter((r) => followUpStatus(r.proximoContacto, today) === "today");
  const thisWeek = records.filter((r) => r.proximoContacto > today && r.proximoContacto <= weekEnd).sort(byDate);
  const later = records.filter((r) => r.proximoContacto > weekEnd).sort(byDate);
  const unscheduled = records.filter((r) => !r.proximoContacto && stageInfo(r.estado).value !== "CERRADO");

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="Seguimientos"
        subtitle={`${overdue.length} vencidos · ${dueToday.length} para hoy · ${thisWeek.length} esta semana`}
      />
      <DataNotice data={data} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Group title="Vencidos" tone="alert" items={overdue} today={today} empty="Nada vencido. ¡Bien!" />
        <Group title="Hoy" tone="today" items={dueToday} today={today} empty="No tienes contactos para hoy." />
        <Group title="Próximos 7 días" items={thisWeek} today={today} empty="Sin contactos esta semana." />
        <Group title="Más adelante" items={later} today={today} empty="Sin contactos agendados más adelante." />
      </div>
      <Group
        title="Sin próximo contacto"
        items={unscheduled}
        today={today}
        empty="Todas las oportunidades abiertas tienen fecha de seguimiento."
        hint="Oportunidades abiertas sin fecha de seguimiento."
      />
    </div>
  );
}

function Group({
  title,
  items,
  today,
  empty,
  hint,
  tone = "default",
}: {
  title: string;
  items: Opportunity[];
  today: string;
  empty: ReactNode;
  hint?: string | undefined;
  tone?: "default" | "alert" | "today" | undefined;
}) {
  const { openEdit } = useCrmDialog();
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card">
      <header className="mb-3 flex items-center gap-2">
        <span
          className={cn(
            "size-2.5 rounded-full",
            tone === "alert" ? "bg-destructive" : tone === "today" ? "bg-warning" : "bg-muted-foreground/40",
          )}
        />
        <h2 className="text-base font-bold">{title}</h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">{items.length}</span>
        {hint && <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">{hint}</span>}
      </header>
      {items.length === 0 ? (
        <p className="rounded-xl bg-surface p-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="-mx-2 divide-y">
          {items.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-2 py-3">
              <button onClick={() => openEdit(r)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold hover:underline">{r.cliente}</p>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <StageBadge estado={r.estado} className="py-0.5" />
                  <span className="tabular">{formatCOP(r.monto)}</span>
                  {r.asignado && <span>· {pretty(r.asignado)}</span>}
                  <span>
                    · Última gestión: {r.ultimaGestion ? `${formatDate(r.ultimaGestion)} (${relativeDay(r.ultimaGestion, today).toLowerCase()})` : "sin registro"}
                  </span>
                </div>
              </button>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {r.proximoContacto && <FollowUpChip date={r.proximoContacto} today={today} />}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => openEdit(r, { ultimaGestion: today, proximoContacto: "" })}
                >
                  <PhoneCall /> <span className="hidden sm:inline">Registrar gestión</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
