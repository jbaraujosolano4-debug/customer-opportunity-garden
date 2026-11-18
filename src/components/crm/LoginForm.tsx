import { useState } from "react";
import { Eye, EyeOff, KeyRound, Lock, LogIn, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/crm/auth-context";

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      const ok = await login(email, password);
      if (ok) {
        window.location.href = "/";
      }
    } finally {
      setSubmitting(false);
    }
  };

  const setCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Lock className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Acceso al CRM</h1>
          <p className="text-sm text-muted-foreground">
            Ingresa tus credenciales para acceder a tus oportunidades y clientes.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@crm.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="password"
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
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full gap-2 mt-2" disabled={submitting}>
              {submitting ? (
                <>Verificando en Google Sheets...</>
              ) : (
                <>
                  <LogIn className="size-4" /> Iniciar sesión
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <ShieldCheck className="size-4" />
              <span>Cuenta de Administrador</span>
            </div>
            <p className="mt-1 text-muted-foreground">
              Credenciales registradas en la pestaña <b>USUARIOS</b> de tu Google Sheet:
            </p>
            <div className="mt-2.5 flex items-center justify-between rounded-lg bg-background p-2 border font-mono">
              <div>
                <p className="text-[11px] font-semibold text-foreground">admin@crm.com</p>
                <p className="text-[10px] text-muted-foreground">Contraseña: admin123</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setCredentials("admin@crm.com", "admin123")}
              >
                Llenar datos
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
