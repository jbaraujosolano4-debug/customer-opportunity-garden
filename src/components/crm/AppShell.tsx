import { useState, type ReactNode } from "react";
import { Link, useHydrated } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronRight,
  Columns3,
  LayoutGrid,
  ListChecks,
  LogOut,
  Menu,
  Plug,
  Plus,
  Shield,
  User,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { opportunitiesQuery } from "@/lib/crm/queries";
import { useCrmDialog } from "./crm-dialog-context";
import { useAuth } from "./auth-context";
import { LoginForm } from "./LoginForm";

export function AppShell({ children }: { children: ReactNode }) {
  const { openNew } = useCrmDialog();
  const { data } = useQuery(opportunitiesQuery);
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const hydrated = useHydrated();
  const mode = hydrated ? data?.mode : undefined;
  const isAuthed = hydrated && isAuthenticated && user;
  const isAdmin = hydrated && user?.rol === "ADMIN";

  const desktopNavItems = [
    { to: "/", label: "Resumen", icon: LayoutGrid },
    { to: "/oportunidades", label: "Oportunidades", icon: ListChecks },
    { to: "/pipeline", label: "Pipeline", icon: Columns3 },
    { to: "/seguimientos", label: "Seguimientos", icon: CalendarClock },
    ...(isAdmin ? [{ to: "/usuarios", label: "Usuarios", icon: Users }] : []),
    { to: "/conexion", label: "Conexión", icon: Plug },
  ];

  // 4 pestañas principales para la barra inferior móvil
  const mobileTabs = [
    { to: "/", label: "Resumen", icon: LayoutGrid },
    { to: "/oportunidades", label: "Clientes", icon: ListChecks },
    { to: "/pipeline", label: "Pipeline", icon: Columns3 },
    { to: "/seguimientos", label: "Agenda", icon: CalendarClock },
  ] as const;

  const userInitials = (user?.nombre || "U")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    window.location.href = "/";
  };

  const handleOpenNew = () => {
    setMobileMenuOpen(false);
    openNew();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ======================================================== */}
      {/* 1. BARRA SUPERIOR (HEADER / TOP NAVBAR)                  */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 border-b bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo y Nombre */}
          <Link to="/" className="flex items-center gap-2.5 active:scale-95 transition-transform">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-md shadow-primary/20">
              C
            </span>
            <div className="flex flex-col">
              <span className="text-[15px] font-extrabold tracking-tight leading-tight">
                CRM Comercial
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Customer Opportunity Garden
              </span>
            </div>
          </Link>

          {/* Menú Horizontal Desktop (Pantallas medianas y grandes) */}
          {isAuthed && (
            <nav className="hidden md:flex items-center gap-1">
              {desktopNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-muted/50"
                  activeProps={{ className: "bg-accent text-accent-foreground font-semibold shadow-xs" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Acciones del extremo derecho */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Indicador de estado Google Sheets (Desktop) */}
            {isAuthed && mode && (
              <Link
                to="/conexion"
                className="hidden lg:inline-flex items-center gap-1.5 rounded-full border bg-background/50 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                <span
                  className={cn(
                    "size-2 rounded-full animate-pulse",
                    mode === "live" ? "bg-success" : mode === "error" ? "bg-destructive" : "bg-warning",
                  )}
                />
                {mode === "live" ? "Google Sheets" : mode === "error" ? "Error" : "Demo"}
              </Link>
            )}

            {/* Botón "+ Nueva oportunidad" */}
            {isAuthed && (
              <Button
                onClick={handleOpenNew}
                size="sm"
                className="h-9 gap-1.5 rounded-xl font-medium shadow-sm active:scale-95 transition-transform"
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">Nueva oportunidad</span>
              </Button>
            )}

            {/* Perfil de Usuario Desktop */}
            {isAuthed && (
              <div className="hidden md:flex items-center gap-2.5 pl-2 border-l">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold leading-none text-foreground">{user.nombre}</span>
                  <span className="text-[10px] text-muted-foreground flex items-center justify-end gap-1 mt-0.5 font-medium">
                    {user.rol === "ADMIN" && <Shield className="size-2.5 text-purple-500" />}
                    {user.rol}
                  </span>
                </div>
                <div
                  className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary border border-primary/20 shadow-xs"
                  title={`${user.nombre} (${user.email})`}
                >
                  {userInitials}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="size-4" />
                </Button>
              </div>
            )}

            {/* Botón de Menú Móvil rápido si no está en desktop */}
            {isAuthed && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 md:hidden text-foreground hover:bg-accent rounded-xl"
                  >
                    <div className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {userInitials}
                    </div>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85%] max-w-sm p-6 flex flex-col justify-between">
                  <div className="space-y-6">
                    <SheetHeader className="text-left space-y-1">
                      <SheetTitle className="text-lg font-bold flex items-center gap-2">
                        <div className="grid size-9 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {userInitials}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground leading-none">{user.nombre}</p>
                          <p className="text-xs text-muted-foreground font-normal mt-0.5">{user.email}</p>
                        </div>
                      </SheetTitle>
                      <SheetDescription className="pt-1">
                        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {user.rol === "ADMIN" && <Shield className="size-3" />}
                          Rol: {user.rol}
                        </span>
                      </SheetDescription>
                    </SheetHeader>

                    {/* Menú de opciones dentro del Sheet */}
                    <div className="space-y-1 pt-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                        Navegación
                      </p>

                      {desktopNavItems.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileMenuOpen(false)}
                          activeOptions={{ exact: item.to === "/" }}
                          className="flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent active:bg-accent"
                          activeProps={{ className: "bg-accent text-primary font-bold" }}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="size-4 text-muted-foreground" />
                            <span>{item.label}</span>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground/60" />
                        </Link>
                      ))}
                    </div>

                    {/* Estado de conexión a Google Sheets */}
                    <div className="rounded-xl border bg-card p-3.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">Google Sheets</span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                            mode === "live" ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
                          )}
                        >
                          ● {mode === "live" ? "Conectado" : "Demo"}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        Los datos se sincronizan directamente con tu hoja de cálculo.
                      </p>
                    </div>
                  </div>

                  {/* Pie del Sheet móvil con Cerrar Sesión */}
                  <div className="pt-4 border-t space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-center gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive h-11 rounded-xl"
                      onClick={handleLogout}
                    >
                      <LogOut className="size-4" />
                      <span>Cerrar sesión</span>
                    </Button>
                    <p className="text-[11px] text-center text-muted-foreground">
                      PWA Ready · CRM Comercial v1.2
                    </p>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. CONTENIDO PRINCIPAL                                    */}
      {/* ======================================================== */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-6 pt-4 pb-28 sm:pb-16 md:pt-6">
        {!hydrated || isLoading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="size-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : !user ? (
          <LoginForm />
        ) : (
          children
        )}
      </main>

      {/* ======================================================== */}
      {/* 3. BARRA INFERIOR MÓVIL ESTILO APP NATIVA (BOTTOM NAVBAR)*/}
      {/* ======================================================== */}
      {isAuthed && (
        <nav
          role="navigation"
          aria-label="Barra de navegación móvil"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden shadow-lg shadow-black/5"
        >
          <div className="grid grid-cols-5 h-16 items-center px-1">
            {mobileTabs.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                activeOptions={{ exact: tab.to === "/" }}
                className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground transition-all active:scale-90"
                activeProps={{ className: "text-primary font-bold [&_svg]:stroke-[2.5]" }}
              >
                <tab.icon className="size-5" />
                <span className="text-[11px] tracking-tight leading-none">{tab.label}</span>
              </Link>
            ))}

            {/* 5ta pestaña: Menú deslizante */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground transition-all active:scale-90 focus:outline-none"
            >
              <Menu className="size-5" />
              <span className="text-[11px] tracking-tight leading-none">Menú</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
