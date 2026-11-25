import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import type { CrmUser } from "@/lib/crm/auth-model";
import { loginServerFn, registerServerFn, resetPasswordServerFn } from "@/lib/crm/auth.functions";

type AuthContextType = {
  user: CrmUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (nombre: string, email: string, pass: string, telefono?: string) => Promise<boolean>;
  resetPassword: (email: string, newPass: string) => Promise<boolean>;
  logout: () => void;
};

const STORAGE_KEY = "crm_auth_user";

const defaultAuth: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  isLoading: true,
  login: async () => false,
  register: async () => false,
  resetPassword: async () => false,
  logout: () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuth);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CrmUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar usuario persistido en localStorage de forma segura solo en el cliente
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as CrmUser;
          setUser(parsed);
        }
      }
    } catch (e) {
      console.error("Error al cargar sesión:", e);
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const authUser = await loginServerFn({ data: { email, password: pass } });
      setUser(authUser);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
      }
      toast.success(`Bienvenido, ${authUser.nombre}`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error al iniciar sesión";
      toast.error(msg);
      return false;
    }
  };

  const register = async (nombre: string, email: string, pass: string, telefono?: string): Promise<boolean> => {
    try {
      const newUser = await registerServerFn({
        data: {
          nombre,
          email,
          password: pass,
          ...(telefono ? { telefono: telefono.trim() } : {}),
        },
      });
      setUser(newUser);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      }
      toast.success(`¡Cuenta creada con éxito! Bienvenido, ${newUser.nombre}`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error al registrarse";
      toast.error(msg);
      return false;
    }
  };

  const resetPassword = async (email: string, newPass: string): Promise<boolean> => {
    try {
      const res = await resetPasswordServerFn({ data: { email, newPassword: newPass } });
      toast.success(res.message || "Contraseña restablecida exitosamente.");
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error al restablecer contraseña";
      toast.error(msg);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    toast.info("Has cerrado sesión");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.rol === "ADMIN",
        isLoading,
        login,
        register,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx ?? defaultAuth;
}
