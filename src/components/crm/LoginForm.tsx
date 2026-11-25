import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Timer,
  User,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/crm/auth-context";

type AuthMode = "login" | "register" | "recovery";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const LOCKOUT_MS = LOCKOUT_MINUTES * 60 * 1000;

function getStorageKey(email: string) {
  return `crm_sec_attempts_${email.trim().toLowerCase()}`;
}

export function LoginForm() {
  const { login, register, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");

  // Campos del formulario
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Estados de seguridad y límite de 5 intentos
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Cargar estado de intentos al escribir o cambiar de email
  useEffect(() => {
    if (typeof window === "undefined" || !email.trim()) {
      setFailedAttempts(0);
      setLockedUntil(null);
      setRemainingSeconds(0);
      return;
    }

    try {
      const raw = localStorage.getItem(getStorageKey(email));
      if (raw) {
        const parsed = JSON.parse(raw) as { attempts: number; lockedUntil: number | null };
        if (parsed.lockedUntil && Date.now() < parsed.lockedUntil) {
          setLockedUntil(parsed.lockedUntil);
          setFailedAttempts(MAX_ATTEMPTS);
          setRemainingSeconds(Math.max(0, Math.ceil((parsed.lockedUntil - Date.now()) / 1000)));
        } else {
          // Si el tiempo de bloqueo ya expiró, limpiar
          if (parsed.lockedUntil && Date.now() >= parsed.lockedUntil) {
            localStorage.removeItem(getStorageKey(email));
            setFailedAttempts(0);
            setLockedUntil(null);
            setRemainingSeconds(0);
          } else {
            setFailedAttempts(parsed.attempts || 0);
            setLockedUntil(null);
          }
        }
      } else {
        setFailedAttempts(0);
        setLockedUntil(null);
      }
    } catch {
      // Ignorar error de parsing en localStorage
    }
  }, [email]);

  // Contador regresivo en vivo para el bloqueo
  useEffect(() => {
    if (!lockedUntil) return;

    const tick = () => {
      const leftMs = lockedUntil - Date.now();
      if (leftMs <= 0) {
        setLockedUntil(null);
        setRemainingSeconds(0);
        setFailedAttempts(0);
        if (email.trim() && typeof window !== "undefined") {
          localStorage.removeItem(getStorageKey(email));
        }
        toast.info("El tiempo de bloqueo ha expirado. Ya puedes intentar nuevamente.");
      } else {
        setRemainingSeconds(Math.ceil(leftMs / 1000));
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil, email]);

  const isLocked = lockedUntil !== null && remainingSeconds > 0;

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs} min`;
  };

  // Manejo de Iniciar Sesión con límite estricto de 5 intentos
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (isLocked) {
      toast.error(
        `Acceso bloqueado por seguridad. Espera ${formatCountdown(remainingSeconds)} o restablece tu clave.`,
      );
      return;
    }

    if (!cleanEmail || !password) {
      toast.error("Por favor completa tu correo y contraseña");
      return;
    }

    setSubmitting(true);
    try {
      const ok = await login(cleanEmail, password);
      if (ok) {
        // Éxito: limpiar intentos fallidos en localStorage
        if (typeof window !== "undefined") {
          localStorage.removeItem(getStorageKey(cleanEmail));
        }
        setFailedAttempts(0);
        setLockedUntil(null);
        window.location.href = "/";
      } else {
        // Falló el login: registrar intento
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);

        if (nextAttempts >= MAX_ATTEMPTS) {
          const lockTime = Date.now() + LOCKOUT_MS;
          setLockedUntil(lockTime);
          setRemainingSeconds(LOCKOUT_MINUTES * 60);
          if (typeof window !== "undefined") {
            localStorage.setItem(
              getStorageKey(cleanEmail),
              JSON.stringify({ attempts: nextAttempts, lockedUntil: lockTime }),
            );
          }
        } else {
          if (typeof window !== "undefined") {
            localStorage.setItem(
              getStorageKey(cleanEmail),
              JSON.stringify({ attempts: nextAttempts, lockedUntil: null }),
            );
          }
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Manejo de Registro de nuevo perfil
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNombre = nombre.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanNombre || !cleanEmail || !password) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    if (password.length < 4) {
      toast.error("La contraseña debe tener al menos 4 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setSubmitting(true);
    try {
      const ok = await register(cleanNombre, cleanEmail, password, telefono.trim());
      if (ok) {
        if (typeof window !== "undefined") {
          localStorage.removeItem(getStorageKey(cleanEmail));
        }
        window.location.href = "/";
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Manejo de Recuperar Contraseña (desbloquea automáticamente la cuenta)
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      toast.error("Por favor completa el correo y la nueva contraseña");
      return;
    }

    if (password.length < 4) {
      toast.error("La nueva contraseña debe tener al menos 4 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setSubmitting(true);
    try {
      const ok = await resetPassword(cleanEmail, password);
      if (ok) {
        // Desbloquear inmediatamente la cuenta en el cliente
        if (typeof window !== "undefined") {
          localStorage.removeItem(getStorageKey(cleanEmail));
        }
        setFailedAttempts(0);
        setLockedUntil(null);
        setPassword("");
        setConfirmPassword("");
        setMode("login");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setPassword("");
    setConfirmPassword("");
    setMode(newMode);
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-8 animate-in fade-in duration-300">
      <div className="w-full max-w-md space-y-6">
        {/* Cabecera dinámica según el modo */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            {mode === "login" && (isLocked ? <ShieldAlert className="size-6 text-destructive-foreground" /> : <Lock className="size-6" />)}
            {mode === "register" && <UserPlus className="size-6" />}
            {mode === "recovery" && <KeyRound className="size-6" />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "login" && "Acceso al CRM"}
            {mode === "register" && "Crear Perfil"}
            {mode === "recovery" && "Recuperar Contraseña"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login" && "Ingresa tus credenciales para acceder a tus oportunidades y clientes."}
            {mode === "register" && "Registra tus datos para comenzar a gestionar tus clientes."}
            {mode === "recovery" && "Ingresa tu correo registrado y define tu nueva contraseña."}
          </p>
        </div>

        {/* Tarjeta del Formulario */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8 space-y-5">
          {/* ======================================================== */}
          {/* MODO 1: INICIAR SESIÓN                                   */}
          {/* ======================================================== */}
          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* ALERTA DE BLOQUEO POR EXCESO DE INTENTOS (5 INTENTOS) */}
              {isLocked && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs space-y-2 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 font-bold text-destructive">
                    <ShieldAlert className="size-4" />
                    <span>Acceso bloqueado por seguridad</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Has superado el límite de <b>{MAX_ATTEMPTS} intentos fallidos</b>. Por protección de tu cuenta, el acceso se encuentra suspendido temporalmente.
                  </p>
                  <div className="flex items-center justify-between rounded-lg bg-background/80 p-2 border border-destructive/20 font-mono">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Timer className="size-3.5" /> Desbloqueo en:
                    </span>
                    <span className="font-bold text-destructive text-xs">
                      {formatCountdown(remainingSeconds)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchMode("recovery")}
                    className="text-xs font-semibold text-primary hover:underline block pt-1"
                  >
                    ¿Olvidaste tu contraseña? Restablécela aquí para desbloquear de inmediato.
                  </button>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="login-email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="tu@correo.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <button
                    type="button"
                    onClick={() => switchMode("recovery")}
                    className="text-xs font-medium text-primary hover:underline focus:outline-none"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLocked || submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {/* ADVERTENCIA DE INTENTOS FALLIDOS EN CURSO (< 5) */}
                {!isLocked && failedAttempts > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium pt-1">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    <span>
                      {failedAttempts} de {MAX_ATTEMPTS} intentos fallidos. Te {MAX_ATTEMPTS - failedAttempts === 1 ? "queda" : "quedan"}{" "}
                      <b>{MAX_ATTEMPTS - failedAttempts}</b> antes del bloqueo.
                    </span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gap-2 mt-3"
                disabled={submitting || isLocked}
                variant={isLocked ? "secondary" : "default"}
              >
                {submitting ? (
                  <>Verificando en Google Sheets...</>
                ) : isLocked ? (
                  <>
                    <Lock className="size-4" /> Bloqueado ({formatCountdown(remainingSeconds)})
                  </>
                ) : (
                  <>
                    <LogIn className="size-4" /> Iniciar sesión
                  </>
                )}
              </Button>

              {/* Indicador de seguridad */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                <span>Protección contra fuerza bruta: máx. 5 intentos</span>
              </div>

              <div className="pt-4 text-center border-t text-sm">
                <span className="text-muted-foreground">¿No tienes una cuenta? </span>
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="font-semibold text-primary hover:underline focus:outline-none"
                >
                  Regístrate aquí
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* MODO 2: REGISTRARSE                                      */}
          {/* ======================================================== */}
          {mode === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="register-nombre">Nombre completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="register-nombre"
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    className="pl-9"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="register-email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="tu@correo.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="register-phone">Teléfono WhatsApp</Label>
                  <span className="text-[11px] text-muted-foreground">Alertas de clientes</span>
                </div>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-2.5 size-4 text-emerald-500" />
                  <Input
                    id="register-phone"
                    type="tel"
                    placeholder="+57 3507056186"
                    className="pl-9"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="register-password">Contraseña</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 4 caracteres"
                    className="pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="register-confirm">Confirmar contraseña</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="register-confirm"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repite la contraseña"
                    className="pl-9"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full gap-2 mt-3" disabled={submitting}>
                {submitting ? (
                  <>Guardando en Google Sheets...</>
                ) : (
                  <>
                    <UserPlus className="size-4" /> Crear perfil y acceder
                  </>
                )}
              </Button>

              <div className="pt-4 text-center border-t text-sm">
                <span className="text-muted-foreground">¿Ya tienes una cuenta? </span>
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-semibold text-primary hover:underline focus:outline-none"
                >
                  Inicia sesión
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* MODO 3: RECUPERAR CONTRASEÑA                             */}
          {/* ======================================================== */}
          {mode === "recovery" && (
            <form onSubmit={handleRecoverySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="recovery-email">Correo electrónico registrado</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="recovery-email"
                    type="email"
                    placeholder="tu@correo.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  El correo con el que está creada tu cuenta en el CRM.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="recovery-password">Nueva contraseña</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="recovery-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nueva clave (mínimo 4 caracteres)"
                    className="pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="recovery-confirm">Confirmar nueva contraseña</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="recovery-confirm"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repite la nueva contraseña"
                    className="pl-9"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full gap-2 mt-3" disabled={submitting}>
                {submitting ? (
                  <>Actualizando en Google Sheets...</>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" /> Restablecer contraseña
                  </>
                )}
              </Button>

              <div className="pt-4 text-center border-t text-sm">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  <ArrowLeft className="size-4" /> Volver al inicio de sesión
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
