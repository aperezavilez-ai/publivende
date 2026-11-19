import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Calendar, BarChart3, Settings, LogOut,
  FolderOpen, Menu,
  Radio, Layers, Rocket, AlertTriangle,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/mock/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnline } from "@/hooks/useOnline";
import { PubliVendeMark } from "@/components/PubliVendeLogo";
import { isProductionModeClient } from "@/lib/production/session";

// Real v2 — Panel de 6 secciones alrededor de la fuerza del producto:
// distribución de contenido por nichos controlada por IA.
const CLIENT_NAV = [
  { to: "/dashboard", label: "Inicio — Coordinadora", icon: LayoutDashboard, color: "#1d4ed8", tint: "#DBEAFE" },
  { to: "/distribuir", label: "Distribuir", icon: Radio, color: "#be123c", tint: "#FFE4E6" },
  { to: "/calendario", label: "Calendario", icon: Calendar, color: "#0284c7", tint: "#E0F2FE" },
  { to: "/resultados", label: "Resultados", icon: BarChart3, color: "#059669", tint: "#D1FAE5" },
  { to: "/biblioteca", label: "Biblioteca", icon: FolderOpen, color: "#b45309", tint: "#FEF3C7" },
  { to: "/configuracion", label: "Configuración", icon: Settings, color: "#475569", tint: "#F1F5F9" },
] as const;

const MOBILE_TABS = [
  { to: "/dashboard", label: "Inicio", icon: LayoutDashboard, color: "#1d4ed8", tint: "#DBEAFE" },
  { to: "/distribuir", label: "Distribuir", icon: Radio, color: "#be123c", tint: "#FFE4E6" },
  { to: "/calendario", label: "Calendario", icon: Calendar, color: "#0284c7", tint: "#E0F2FE" },
  { to: "/resultados", label: "Resultados", icon: BarChart3, color: "#059669", tint: "#D1FAE5" },
  { to: "/configuracion", label: "Ajustes", icon: Settings, color: "#475569", tint: "#F1F5F9" },
] as const;

function NavLink({
  to,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const online = useOnline();

  const handleSignOut = () => {
    signOut();
    router.navigate({ to: "/" });
  };

  if (!user) return null;

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");
  const closeMenu = () => setOpen(false);

  return (
    <div className="min-h-screen flex w-full bg-white text-slate-900 antialiased selection:bg-blue-100 selection:text-slate-900">
      {/* Mobile trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-3 left-3 z-50 p-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 shadow-md"
        aria-label="Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar Linear-style */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-40 w-[80vw] max-w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <span className="font-black text-white text-sm tracking-tight">P</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                PubliVende <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">AI</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {user.is_admin ? "Centro Administrador" : `Espacio · ${user.plan.toUpperCase()}`}
              </span>
            </div>
          </Link>
        </div>

        {/* System Health Pill */}
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="truncate">{user.is_admin ? "MeAI (Claude) · Mercado Pago" : "IA activa · Pagos con Mercado Pago"}</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 custom-scrollbar">
          <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Coordinación & Crecimiento
          </div>
          {CLIENT_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={closeMenu}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all group",
                  active
                    ? "bg-blue-50 text-blue-800 border border-blue-200 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                )}
              >
                <span
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors"
                  style={active ? { backgroundColor: item.tint } : undefined}
                >
                  <Icon
                    className="w-4 h-4 shrink-0 transition-colors"
                    style={{ color: active ? item.color : "#64748b" }}
                  />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}

          {user.is_admin && (
            <>
              <div className="pt-4 pb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Super Admin
              </div>
              <Link
                to="/red"
                onClick={closeMenu}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  isActive("/red")
                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                )}
              >
                <Rocket className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Red PubliVende</span>
              </Link>
              <Link
                to="/plataforma"
                onClick={closeMenu}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  isActive("/plataforma")
                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                )}
              >
                <Layers className="w-4 h-4 shrink-0 text-sky-600" />
                <span>Plataforma API</span>
              </Link>
            </>
          )}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1 rounded-lg bg-slate-50 border border-slate-200">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-slate-900 truncate flex items-center gap-1.5">
                {user.nombre}
                {online ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="En línea" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Offline" />
                )}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {user.nombre_negocio || "Mi Negocio"}
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-600 hover:text-red-700 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {open && <div onClick={() => setOpen(false)} className="md:hidden fixed inset-0 bg-slate-900/40 z-30" />}

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 overflow-y-auto bg-white">
        {!isProductionModeClient() && (
          <div className="bg-amber-50 border-b border-amber-300 text-amber-900 px-4 py-2.5 text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Modo demostración: las publicaciones no salen a redes reales.
          </div>
        )}
        <div className="p-4 md:p-8 max-w-7xl mx-auto pt-16 md:pt-8 pb-24 md:pb-12">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white pb-[max(env(safe-area-inset-bottom),8px)]">
        <div className="grid grid-cols-5 px-1 pt-1">
          {MOBILE_TABS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-blue-700 font-semibold" : "text-slate-500 hover:text-slate-800",
                )}
              >
                <span
                  className="w-7 h-6 rounded-md flex items-center justify-center"
                  style={active ? { backgroundColor: item.tint } : undefined}
                >
                  <Icon className="w-4 h-4" style={{ color: active ? item.color : "#64748b" }} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
