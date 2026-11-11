import type { ReactNode } from "react";
import { Link, useHydrated } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Columns3, LayoutGrid, ListChecks, Plug, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { opportunitiesQuery } from "@/lib/crm/queries";
import { useCrmDialog } from "./crm-dialog-context";

const NAV = [
  { to: "/", label: "Resumen", icon: LayoutGrid },
  { to: "/oportunidades", label: "Oportunidades", icon: ListChecks },
  { to: "/pipeline", label: "Pipeline", icon: Columns3 },
  { to: "/seguimientos", label: "Seguimientos", icon: CalendarClock },
  { to: "/conexion", label: "Conexión", icon: Plug },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { openNew } = useCrmDialog();
  const { data } = useQuery(opportunitiesQuery);
  // The shell renders before page data reaches the browser, so show the status only after hydration.
  const hydrated = useHydrated();
  const mode = hydrated ? data?.mode : undefined;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-extrabold text-primary-foreground">
              C
            </span>
            <span className="text-[15px] font-bold tracking-tight">CRM Comercial</span>
          </Link>

          <nav className="mx-auto hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "bg-accent text-accent-foreground hover:text-accent-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3 md:ml-0">
            {mode && (
              <Link
                to="/conexion"
                className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground lg:inline-flex"
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    mode === "live" ? "bg-success" : mode === "error" ? "bg-destructive" : "bg-warning",
                  )}
                />
                {mode === "live" ? "Google Sheets" : mode === "error" ? "Error de conexión" : "Demo"}
              </Link>
            )}
            <Button onClick={() => openNew()} size="sm" className="h-9 rounded-lg">
              <Plus /> <span className="hidden sm:inline">Nueva oportunidad</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 md:pb-12 md:pt-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
