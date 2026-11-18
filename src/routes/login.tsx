import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/crm/LoginForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar Sesión | CRM Comercial" },
      { name: "description", content: "Inicia sesión para acceder al CRM comercial." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return <LoginForm />;
}
