import { Link } from "@tanstack/react-router";
import { AlertTriangle, FlaskConical } from "lucide-react";

import type { OpportunitiesPayload } from "@/lib/crm/model";

export function DataNotice({ data }: { data: OpportunitiesPayload }) {
  if (data.mode === "live") return null;
  if (data.mode === "error") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div>
          <p className="font-semibold text-foreground">No pudimos leer tu hoja de Google</p>
          <p className="mt-0.5 text-muted-foreground">{data.error}</p>
          <Link to="/conexion" className="mt-2 inline-block font-semibold text-accent-foreground hover:underline">
            Revisar la conexión →
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-accent p-4 text-sm">
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
      <div className="flex-1">
        <p className="font-semibold text-foreground">Modo demostración</p>
        <p className="mt-0.5 text-muted-foreground">
          Ves los datos de ejemplo de tu hoja. Los cambios no se guardan hasta conectar Apps Script.
        </p>
      </div>
      <Link to="/conexion" className="shrink-0 font-semibold text-accent-foreground hover:underline">
        Conectar →
      </Link>
    </div>
  );
}
