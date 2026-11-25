import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Check, CheckCircle2, Copy, FlaskConical, MessageCircle, RefreshCw, Send, Sparkles, XCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/crm/PageHeader";
import { cn } from "@/lib/utils";
import { APPS_SCRIPT_CODE } from "@/lib/crm/apps-script-code";
import { opportunitiesQuery } from "@/lib/crm/queries";
import { createWhatsAppUrl, DEFAULT_ADMIN_PHONE } from "@/lib/crm/whatsapp";

export const Route = createFileRoute("/conexion")({
  head: () => ({
    meta: [
      { title: "Conexión con Google Sheets | CRM Comercial" },
      { name: "description", content: "Conecta el CRM a tu hoja de Google mediante Apps Script en cuatro pasos." },
      { property: "og:title", content: "Conexión con Google Sheets | CRM Comercial" },
      { property: "og:description", content: "Conecta el CRM a tu hoja de Google mediante Apps Script." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opportunitiesQuery),
  component: ConnectionPage,
});

function ConnectionPage() {
  const { data, isFetching } = useSuspenseQuery(opportunitiesQuery);
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    toast.success("Código copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  const status = {
    live: { icon: <CheckCircle2 />, title: "Conectado a Google Sheets", text: `Leyendo ${data.records.length} oportunidades de tu hoja. Los cambios se guardan allí.`, cls: "border-success/30 bg-success/5 [&_svg]:text-success" },
    error: { icon: <XCircle />, title: "La conexión falló", text: data.error ?? "", cls: "border-destructive/30 bg-destructive/5 [&_svg]:text-destructive" },
    demo: { icon: <FlaskConical />, title: "Sin conectar — modo demostración", text: "Sigue los pasos de abajo y comparte la URL de Apps Script para guardar los cambios en tu hoja.", cls: "border-primary/25 bg-accent [&_svg]:text-accent-foreground" },
  }[data.mode];

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-rise">
      <PageHeader title="Conexión con Google Sheets" subtitle="Tu hoja sigue siendo la fuente de verdad; el CRM la lee y escribe a través de Apps Script." />

      <div className={cn("flex items-start gap-3 rounded-2xl border p-5 [&_svg]:size-5 [&_svg]:shrink-0", status.cls)}>
        {status.icon}
        <div className="flex-1">
          <p className="font-semibold">{status.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{status.text}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="bg-card [&_svg]:size-4"
          onClick={() => qc.invalidateQueries({ queryKey: opportunitiesQuery.queryKey })}
          disabled={isFetching}
        >
          <RefreshCw className={cn(isFetching && "animate-spin")} /> Probar
        </Button>
      </div>

      <ol className="space-y-4">
        <Step n={1} title="Abre Apps Script desde tu hoja">
          En tu hoja de Google, ve a <b>Extensiones → Apps Script</b>. Borra el código de ejemplo que aparece.
        </Step>
        <Step n={2} title="Pega este código y guarda">
          <p>
            Lee las columnas por su nombre, así que el orden no importa. Si falta alguna (NIT, Ciudad, Canal, Categoría, Próximo
            contacto, Pares, Teléfono…) la crea al final de la hoja.
          </p>
          <div className="relative mt-3 overflow-hidden rounded-xl border bg-foreground">
            <Button size="sm" variant="secondary" onClick={copy} className="absolute right-2 top-2 h-8">
              {copied ? <Check /> : <Copy />} {copied ? "Copiado" : "Copiar código"}
            </Button>
            <pre className="max-h-72 overflow-auto p-4 pt-12 text-[11px] leading-relaxed text-background">
              <code>{APPS_SCRIPT_CODE}</code>
            </pre>
          </div>
        </Step>
        <Step n={3} title="Publícalo como aplicación web">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Botón <b>Implementar → Nueva implementación</b>. En el engranaje elige <b>Aplicación web</b>.
            </li>
            <li>
              <b>Ejecutar como:</b> Yo. <b>Quién tiene acceso:</b> Cualquier persona.
            </li>
            <li>Pulsa Implementar y autoriza el acceso con tu cuenta de Google.</li>
          </ul>
        </Step>
        <Step n={4} title="Conexión de WhatsApp y Alertas Automáticas">
          <div className="space-y-2">
            <p>
              El sistema incluye un módulo automatizado que envía alertas de clientes programados al WhatsApp de cada asesor y el consolidado general al Administrador.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <a
                href={createWhatsAppUrl(
                  DEFAULT_ADMIN_PHONE,
                  "¡Hola Administrador! Prueba de conexión exitosa con el sistema de alertas de CRM Comercial JOMA.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                <MessageCircle className="size-3.5" />
                <span>Probar WhatsApp del Administrador ({DEFAULT_ADMIN_PHONE})</span>
              </a>
            </div>
          </div>
        </Step>
      </ol>

      <p className="text-xs text-muted-foreground">
        Si más adelante editas el código, usa <b>Implementar → Administrar implementaciones → Editar → Nueva versión</b> para que la
        URL siga siendo la misma.
      </p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4 rounded-2xl border bg-card p-5 shadow-card">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{n}</span>
      <div className="min-w-0 flex-1 text-sm text-muted-foreground">
        <h3 className="mb-1.5 text-base font-bold text-foreground">{title}</h3>
        {children}
      </div>
    </li>
  );
}
