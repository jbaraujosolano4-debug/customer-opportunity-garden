import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Clock, MessageCircle, PhoneCall, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

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
import { opportunitiesQuery, useFilteredOpportunities } from "@/lib/crm/queries";
import { listUsersServerFn } from "@/lib/crm/auth.functions";
import { sendWhatsAppAlertsServerFn, setupWhatsAppTriggerServerFn } from "@/lib/crm/crm.functions";
import {
  buildAdminConsolidatedMessage,
  buildAdvisorAlertMessage,
  buildSingleClientAlertMessage,
  cleanWhatsAppNumber,
  createWhatsAppUrl,
  DEFAULT_ADMIN_PHONE,
} from "@/lib/crm/whatsapp";

export const Route = createFileRoute("/seguimientos")({
  head: () => ({
    meta: [
      { title: "Seguimientos & WhatsApp | CRM Comercial" },
      { name: "description", content: "Agenda de seguimientos y automatización de alertas por WhatsApp para clientes programados." },
      { property: "og:title", content: "Seguimientos & WhatsApp | CRM Comercial" },
      { property: "og:description", content: "Agenda de seguimientos con alertas automatizadas a WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opportunitiesQuery),
  component: FollowUpsPage,
});

function FollowUpsPage() {
  const { records, mode, error, isAdmin, user } = useFilteredOpportunities();
  const today = todayISO();
  const weekEnd = addDays(today, 7);
  const byDate = (a: Opportunity, b: Opportunity) => a.proximoContacto.localeCompare(b.proximoContacto);

  // Consulta de usuarios para obtener sus números de WhatsApp registrados
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => listUsersServerFn(),
  });

  const overdue = records.filter((r) => followUpStatus(r.proximoContacto, today) === "overdue").sort(byDate);
  const dueToday = records.filter((r) => followUpStatus(r.proximoContacto, today) === "today");
  const thisWeek = records.filter((r) => r.proximoContacto > today && r.proximoContacto <= weekEnd).sort(byDate);
  const later = records.filter((r) => r.proximoContacto > weekEnd).sort(byDate);
  const unscheduled = records.filter((r) => !r.proximoContacto && stageInfo(r.estado).value !== "CERRADO");

  // Clientes que deben ser notificados hoy (todos los agendados para hoy o anteriores vencidos, independiente del estado)
  const scheduledForAlerts = useMemo(() => {
    return records.filter((r) => r.proximoContacto && r.proximoContacto <= today);
  }, [records, today]);

  // Agrupar clientes de hoy por asesor asignado para las alertas de WhatsApp
  const advisorGroups = useMemo(() => {
    const map = new Map<string, { advisorName: string; phone: string; records: Opportunity[] }>();
    for (const r of scheduledForAlerts) {
      const advName = (r.asignado || "").trim() || "Sin Asignar";
      const key = advName.toLowerCase();
      const existing = map.get(key) || {
        advisorName: advName,
        phone: "",
        records: [],
      };
      if (!existing.phone && users.length > 0) {
        const found = users.find(
          (u) =>
            u.nombre.trim().toLowerCase() === key ||
            u.email.trim().toLowerCase() === key ||
            (key.length > 2 && u.nombre.toLowerCase().includes(key)),
        );
        if (found?.telefono) {
          existing.phone = found.telefono;
        }
      }
      existing.records.push(r);
      map.set(key, existing);
    }
    return Array.from(map.values());
  }, [scheduledForAlerts, users]);

  // Mapa rápido de teléfonos de asesores por nombre
  const userPhoneMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      if (u.telefono) {
        map.set(u.nombre.trim().toLowerCase(), u.telefono);
        map.set(u.email.trim().toLowerCase(), u.telefono);
      }
    }
    return map;
  }, [users]);

  // Estado para la ejecución de alertas desde el CRM
  const [runningAlerts, setRunningAlerts] = useState(false);
  const [activatingTrigger, setActivatingTrigger] = useState(false);

  const handleRunAlerts = async () => {
    setRunningAlerts(true);
    try {
      const res = await sendWhatsAppAlertsServerFn({});
      toast.success("Alertas automáticas procesadas", {
        description: `Se estructuraron alertas para ${res.totalScheduled} clientes agendados.`,
      });
    } catch (err) {
      toast.error("Error al ejecutar alertas", {
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      setRunningAlerts(false);
    }
  };

  const handleSetupTrigger = async () => {
    setActivatingTrigger(true);
    try {
      const res = await setupWhatsAppTriggerServerFn();
      toast.success("Disparador diario activado", { description: res.message });
    } catch (err) {
      toast.error("No se pudo activar el disparador diario", {
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      setActivatingTrigger(false);
    }
  };

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="Seguimientos & WhatsApp"
        subtitle={`${overdue.length} vencidos · ${dueToday.length} para hoy · ${thisWeek.length} esta semana`}
      />
      <DataNotice data={{ mode, records, error }} />

      {/* ======================================================== */}
      {/* PANEL DE AUTOMATIZACIÓN Y ALERTAS WHATSAPP               */}
      {/* ======================================================== */}
      <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-card dark:bg-emerald-950/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="grid size-12 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 shrink-0">
              <MessageCircle className="size-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Alertas y Notificaciones de WhatsApp
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="size-3" /> Conectado a WhatsApp
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground max-w-2xl leading-relaxed">
                Envía las notificaciones de los clientes agendados directamente al WhatsApp de cada perfil de asesor creado. El perfil administrativo (<b>{DEFAULT_ADMIN_PHONE}</b>) recibe el consolidado diario general.
              </p>
            </div>
          </div>

          {/* Acciones principales de WhatsApp */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isAdmin && (
              <a
                href={createWhatsAppUrl(
                  DEFAULT_ADMIN_PHONE,
                  buildAdminConsolidatedMessage(
                    advisorGroups.map((g) => ({
                      advisor: { nombre: g.advisorName, telefono: g.phone },
                      records: g.records,
                    })),
                    scheduledForAlerts.length,
                    formatDate(today),
                  ),
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
                title="Abrir WhatsApp del Administrador con el consolidado del día"
              >
                <MessageCircle className="size-4" />
                <span>Consolidado Admin ({DEFAULT_ADMIN_PHONE})</span>
              </a>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-9 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
              onClick={handleRunAlerts}
              disabled={runningAlerts}
              title="Ejecuta la función de alertas en Google Apps Script"
            >
              <Send className="size-3.5" />
              <span>{runningAlerts ? "Ejecutando..." : "Ejecutar bot Apps Script"}</span>
            </Button>

            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleSetupTrigger}
                disabled={activatingTrigger}
                title="Configura en Google Apps Script el envío automático diario a las 8:00 AM"
              >
                <Clock className="size-3.5" />
                <span>{activatingTrigger ? "Configurando..." : "Activar bot diario 8 AM"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tarjetas de Asesores a Notificar Hoy */}
        <div className="mt-4 pt-4 border-t border-emerald-500/20">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-foreground">
              Asesores con clientes agendados para hoy ({advisorGroups.length}):
            </span>
            <span className="text-xs text-muted-foreground">
              Total clientes: <b>{scheduledForAlerts.length}</b>
            </span>
          </div>

          {advisorGroups.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-background/60 p-3.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
              <span>No hay clientes con fecha de próximo contacto agendada para hoy. ¡Todo al día!</span>
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {advisorGroups.map((grp) => {
                const targetPhone = grp.phone || DEFAULT_ADMIN_PHONE;
                const msg = buildAdvisorAlertMessage(grp.advisorName, grp.records, formatDate(today));
                const waUrl = createWhatsAppUrl(targetPhone, msg);

                return (
                  <div
                    key={grp.advisorName}
                    className="flex items-center justify-between rounded-xl border bg-card p-3 shadow-xs hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-foreground truncate">
                        {pretty(grp.advisorName)}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <span className="inline-block size-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <b>{grp.records.length}</b> {grp.records.length === 1 ? "cliente" : "clientes"}
                        {grp.phone ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                            · {grp.phone}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-500">· Sin tel. (usa Admin)</span>
                        )}
                      </p>
                    </div>

                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-emerald-600/15 px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-600 hover:text-white dark:text-emerald-300 dark:hover:bg-emerald-600 active:scale-95 transition-all"
                      title={`Enviar recordatorio de ${grp.records.length} clientes a su WhatsApp`}
                    >
                      <MessageCircle className="size-3.5" />
                      <span>Notificar</span>
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Grupos de Agenda de Seguimientos */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Group
          title="Vencidos"
          tone="alert"
          items={overdue}
          today={today}
          userPhoneMap={userPhoneMap}
          empty="Nada vencido. ¡Bien!"
        />
        <Group
          title="Hoy"
          tone="today"
          items={dueToday}
          today={today}
          userPhoneMap={userPhoneMap}
          empty="No tienes contactos para hoy."
        />
        <Group
          title="Próximos 7 días"
          items={thisWeek}
          today={today}
          userPhoneMap={userPhoneMap}
          empty="Sin contactos esta semana."
        />
        <Group
          title="Más adelante"
          items={later}
          today={today}
          userPhoneMap={userPhoneMap}
          empty="Sin contactos agendados más adelante."
        />
      </div>

      <Group
        title="Sin próximo contacto"
        items={unscheduled}
        today={today}
        userPhoneMap={userPhoneMap}
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
  userPhoneMap,
  tone = "default",
}: {
  title: string;
  items: Opportunity[];
  today: string;
  empty: ReactNode;
  hint?: string | undefined;
  userPhoneMap: Map<string, string>;
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
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          {items.length}
        </span>
        {hint && <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">{hint}</span>}
      </header>

      {items.length === 0 ? (
        <p className="rounded-xl bg-surface p-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="-mx-2 divide-y">
          {items.map((r) => {
            const advisorKey = (r.asignado || "").trim().toLowerCase();
            const advisorPhone = userPhoneMap.get(advisorKey) || DEFAULT_ADMIN_PHONE;
            const waAlertUrl = createWhatsAppUrl(advisorPhone, buildSingleClientAlertMessage(r, today));

            return (
              <li key={r.id} className="flex items-center gap-3 px-2 py-3">
                <button onClick={() => openEdit(r)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold hover:underline">{r.cliente}</p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <StageBadge estado={r.estado} className="py-0.5" />
                    <span className="tabular font-medium">{formatCOP(r.monto)}</span>
                    {r.pares > 0 && <span className="tabular">({r.pares.toLocaleString("es-CO")} p.)</span>}
                    {r.asignado && <span>· {pretty(r.asignado)}</span>}
                    <span>
                      · Última gestión:{" "}
                      {r.ultimaGestion
                        ? `${formatDate(r.ultimaGestion)} (${relativeDay(r.ultimaGestion, today).toLowerCase()})`
                        : "sin registro"}
                    </span>
                  </div>
                </button>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  {r.proximoContacto && <FollowUpChip date={r.proximoContacto} today={today} />}
                  <div className="flex items-center gap-1.5">
                    <a
                      href={waAlertUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300 transition-colors"
                      title={`Enviar recordatorio de este cliente a WhatsApp (${advisorPhone})`}
                    >
                      <MessageCircle className="size-3.5 text-emerald-500" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => openEdit(r, { ultimaGestion: today, proximoContacto: "" })}
                    >
                      <PhoneCall /> <span className="hidden sm:inline">Registrar gestión</span>
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
