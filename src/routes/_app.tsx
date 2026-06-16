import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/mock/auth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "login", plan: "free" } });
  }, [user, loading, navigate]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Cargando…</div>;

  return <AppShell><Outlet /></AppShell>;
}
