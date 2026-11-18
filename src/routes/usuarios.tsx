import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertCircle,
  KeyRound,
  Mail,
  Pencil,
  Plus,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/crm/PageHeader";
import { useAuth } from "@/components/crm/auth-context";
import {
  listUsersServerFn,
  saveUserServerFn,
  deleteUserServerFn,
} from "@/lib/crm/auth.functions";
import type { CrmUser, UserRole, UserStatus } from "@/lib/crm/auth-model";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/usuarios")({
  head: () => ({
    meta: [
      { title: "Gestión de Usuarios | CRM Comercial" },
      { name: "description", content: "Administración y control de accesos de usuarios del CRM." },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CrmUser | null>(null);

  // Form states
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<UserRole>("ASESOR");
  const [estado, setEstado] = useState<UserStatus>("ACTIVO");

  // Consulta de usuarios
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => listUsersServerFn(),
    enabled: isAdmin,
  });

  // Mutación para guardar usuario
  const saveMutation = useMutation({
    mutationFn: (data: {
      id?: string;
      nombre: string;
      email: string;
      password?: string;
      rol: UserRole;
      estado: UserStatus;
    }) => saveUserServerFn({ data }),
    onSuccess: () => {
      toast.success(editingUser ? "Usuario actualizado en Google Sheets" : "Usuario creado en Google Sheets");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeDialog();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al guardar usuario");
    },
  });

  // Mutación para eliminar usuario
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUserServerFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Usuario eliminado de Google Sheets");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al eliminar usuario");
    },
  });

  const openNew = () => {
    setEditingUser(null);
    setNombre("");
    setEmail("");
    setPassword("");
    setRol("ASESOR");
    setEstado("ACTIVO");
    setDialogOpen(true);
  };

  const openEdit = (u: CrmUser) => {
    setEditingUser(u);
    setNombre(u.nombre);
    setEmail(u.email);
    setPassword("");
    setRol(u.rol);
    setEstado(u.estado);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }
    if (!editingUser && !password.trim()) {
      toast.error("La contraseña es obligatoria al crear un nuevo usuario");
      return;
    }

    saveMutation.mutate({
      id: editingUser?.id,
      nombre,
      email,
      password: password.trim() ? password.trim() : undefined,
      rol,
      estado,
    });
  };

  const handleDelete = (u: CrmUser) => {
    if (u.id === currentUser?.id) {
      toast.error("No puedes eliminar tu propio usuario actual");
      return;
    }
    if (confirm(`¿Estás seguro de que deseas eliminar al usuario "${u.nombre}" (${u.email})?`)) {
      deleteMutation.mutate(u.id);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ShieldAlert className="size-12 text-destructive mb-3" />
        <h2 className="text-xl font-bold">Acceso Restringido</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Esta sección está disponible únicamente para usuarios con rol de <b>Administrador</b>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Gestión de Usuarios"
          subtitle={`${users.length} cuentas registradas en la pestaña USUARIOS de Google Sheets`}
        />
        <Button onClick={openNew} className="gap-2 h-9 rounded-lg">
          <Plus className="size-4" /> Nuevo usuario
        </Button>
      </div>

      {/* Tabla Desktop */}
      <div className="hidden md:block rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5">Usuario</th>
                <th className="px-5 py-3.5">Correo</th>
                <th className="px-5 py-3.5">Rol</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5">Creado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Cargando usuarios desde Google Sheets...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No se encontraron usuarios registrados.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const initials = u.nombre
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  const isCurrent = u.id === currentUser?.id;

                  return (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {initials || "U"}
                          </div>
                          <div>
                            <p className="font-medium text-foreground flex items-center gap-2">
                              {u.nombre}
                              {isCurrent && (
                                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                  Tú
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs">
                        {u.email}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
                            u.rol === "ADMIN"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                          )}
                        >
                          <Shield className="size-3" />
                          {u.rol}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            u.estado === "ACTIVO"
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive",
                          )}
                        >
                          {u.estado === "ACTIVO" ? (
                            <UserCheck className="size-3" />
                          ) : (
                            <UserX className="size-3" />
                          )}
                          {u.estado}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground text-xs">
                        {u.fechaCreacion || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openEdit(u)}
                            title="Editar usuario"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(u)}
                            disabled={isCurrent}
                            title={isCurrent ? "No puedes eliminarte a ti mismo" : "Eliminar usuario"}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista de Tarjetas Móvil (Mobile Cards) */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground bg-card rounded-2xl border">
            Cargando usuarios...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground bg-card rounded-2xl border">
            No hay usuarios registrados.
          </div>
        ) : (
          users.map((u) => {
            const initials = u.nombre
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            const isCurrent = u.id === currentUser?.id;

            return (
              <div
                key={u.id}
                className="rounded-2xl border bg-card p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                      {initials || "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate flex items-center gap-1.5">
                        {u.nombre}
                        {isCurrent && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[9px] font-semibold text-primary">
                            Tú
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">
                        {u.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg"
                      onClick={() => openEdit(u)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(u)}
                      disabled={isCurrent}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                        u.rol === "ADMIN"
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                      )}
                    >
                      <Shield className="size-2.5" />
                      {u.rol}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        u.estado === "ACTIVO"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {u.estado}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {u.fechaCreacion || "—"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dialog para Crear / Editar Usuario */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}
              </DialogTitle>
              <DialogDescription>
                Los datos se guardan y sincronizan automáticamente en la pestaña <b>USUARIOS</b> de Google Sheets.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="user-nombre">Nombre completo</Label>
                <Input
                  id="user-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="user-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@crm.com"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-pass">
                  {editingUser ? "Nueva Contraseña (opcional)" : "Contraseña"}
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="user-pass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingUser ? "Dejar en blanco para no cambiarla" : "••••••••"}
                    className="pl-9"
                    required={!editingUser}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Rol</Label>
                  <Select value={rol} onValueChange={(v) => setRol(v as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASESOR">ASESOR</SelectItem>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Select value={estado} onValueChange={(v) => setEstado(v as UserStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVO">ACTIVO</SelectItem>
                      <SelectItem value="INACTIVO">INACTIVO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Guardando en Google Sheets..." : "Guardar usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
