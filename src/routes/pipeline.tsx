import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState, type DragEvent } from "react";
import { toast } from "sonner";

import { DataNotice } from "@/components/crm/DataNotice";
import { FollowUpChip } from "@/components/crm/FollowUpChip";
import { PageHeader } from "@/components/crm/PageHeader";
import { useCrmDialog } from "@/components/crm/crm-dialog-context";
import { cn } from "@/lib/utils";
import { TONE_CLASSES, formatCOP, formatCompactCOP, pretty, stageInfo, stagesFor, todayISO } from "@/lib/crm/model";
import { opportunitiesQuery, useSaveOpportunity } from "@/lib/crm/queries";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline | CRM Comercial" },
      { name: "description", content: "Tablero de oportunidades por etapa comercial: arrastra para avanzar cada negocio." },
      { property: "og:title", content: "Pipeline | CRM Comercial" },
      { property: "og:description", content: "Tablero de oportunidades por etapa comercial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opportunitiesQuery),
  component: PipelinePage,
});

function PipelinePage() {
  const { data } = useSuspenseQuery(opportunitiesQuery);
  const { openNew, openEdit } = useCrmDialog();
  const save = useSaveOpportunity();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const today = todayISO();
  const records = data.records;
  const stages = stagesFor(records);

  const onDrop = async (e: DragEvent, stageValue: string) => {
    e.preventDefault();
    setOverStage(null);
    const id = e.dataTransfer.getData("text/plain") || dragId;
    setDragId(null);
    const record = records.find((r) => r.id === id);
    if (!record || stageInfo(record.estado).value === stageValue) return;
    try {
      await save.mutateAsync({ ...record, estado: stageValue, ultimaGestion: today });
      toast.success(`${record.cliente} → ${stageInfo(stageValue).label}`);
    } catch (err) {
      toast.error("No se pudo mover", { description: err instanceof Error ? err.message : undefined });
    }
  };

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader title="Pipeline" subtitle="Arrastra una tarjeta para cambiar su etapa. En el celular, tócala para editarla." />
      <DataNotice data={data} />

      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
        <div className="flex min-w-max gap-3">
          {stages.map((stage) => {
            const items = records.filter((r) => stageInfo(r.estado).value === stage.value);
            const value = items.reduce((s, r) => s + r.monto, 0);
            const tone = TONE_CLASSES[stage.tone];
            return (
              <section
                key={stage.value}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverStage(stage.value);
                }}
                onDragLeave={() => setOverStage((s) => (s === stage.value ? null : s))}
                onDrop={(e) => onDrop(e, stage.value)}
                className={cn(
                  "flex w-72 shrink-0 flex-col rounded-2xl bg-surface p-2.5 transition-colors",
                  overStage === stage.value && "bg-accent ring-2 ring-primary/40",
                )}
              >
                <header className="flex items-center justify-between px-1.5 pb-2.5 pt-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2.5 rounded-full", tone.dot)} />
                    <h2 className="text-sm font-bold">{stage.label}</h2>
                    <span className="rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground">{items.length}</span>
                  </div>
                  <span className="tabular text-xs font-semibold text-muted-foreground">{formatCompactCOP(value)}</span>
                </header>

                <div className="flex min-h-24 flex-1 flex-col gap-2">
                  {items.map((r) => (
                    <article
                      key={r.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", r.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragId(r.id);
                      }}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => openEdit(r)}
                      className={cn(
                        "cursor-grab rounded-xl border bg-card p-3.5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float active:cursor-grabbing",
                        dragId === r.id && "opacity-40",
                      )}
                    >
                      <p className="line-clamp-2 text-sm font-semibold leading-snug">{r.cliente}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {[pretty(r.categoria), pretty(r.producto), pretty(r.ciudad || r.region)].filter(Boolean).join(" · ")}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="tabular text-sm font-bold">{formatCOP(r.monto)}</span>
                        <FollowUpChip date={r.proximoContacto} today={today} />
                      </div>
                      {r.asignado && (
                        <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">{pretty(r.asignado)}</p>
                      )}
                    </article>
                  ))}
                  <button
                    onClick={() => openNew({ estado: stage.value })}
                    className="flex items-center justify-center gap-1 rounded-xl border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-accent-foreground"
                  >
                    <Plus className="size-3.5" /> Agregar
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
