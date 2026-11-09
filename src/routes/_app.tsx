import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/mock/auth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white text-zinc-900">
      <div className="p-8 max-w-md w-full bg-white border border-zinc-200 shadow-sm rounded-xl text-center space-y-4">
        <h3 className="text-lg font-bold text-rose-600">Error al cargar la sección</h3>
        <p className="text-xs text-zinc-500">{error?.message || "Ocurrió un error inesperado."}</p>
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              localStorage.clear();
              window.location.href = "/";
            }
          }}
          className="w-full px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded text-xs font-medium transition cursor-pointer"
        >
          Limpiar sesión y volver al inicio
        </button>
      </div>
    </div>
  ),
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
