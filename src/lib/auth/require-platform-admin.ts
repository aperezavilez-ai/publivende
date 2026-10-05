import { redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/mock/db";

/** Redirige a dashboard si el usuario no es administrador de la plataforma. */
export function requirePlatformAdmin() {
  const user = getCurrentUser();
  if (!user?.is_admin) {
    throw redirect({ to: "/dashboard" });
  }
}
