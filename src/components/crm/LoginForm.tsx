import { useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Lock, LogIn, Mail, User, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/crm/auth-context";

type AuthMode = "login" | "register" | "recovery";

export function LoginForm() {
  const { login, register, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");

  // Campos del formulario
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Manejo de Iniciar Sesión
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    setSubmitting(true);
    try {
      const ok = await login(cleanEmail, password);
      if (ok) {
        window.location.href = "/";
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Manejo de Registro de nuevo perfil
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNombre = nombre.trim();
    const cleanEmail = email.trim();

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
      const ok = await register(cleanNombre, cleanEmail, password);
      if (ok) {
        window.location.href = "/";
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Manejo de Recuperar Contraseña
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

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
            {mode === "login" && <Lock className="size-6" />}
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
        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          {/* ======================================================== */}
          {/* MODO 1: INICIAR SESIÓN                                   */}
          {/* ======================================================== */}
          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
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

              <Button type="submit" className="w-full gap-2 mt-3" disabled={submitting}>
                {submitting ? (
                  <>Verificando en Google Sheets...</>
                ) : (
                  <>
                    <LogIn className="size-4" /> Iniciar sesión
                  </>
                )}
              </Button>

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
