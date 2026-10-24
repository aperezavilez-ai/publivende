import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, PlusSquare, Calendar, MessageCircle, Zap, BarChart3, Settings, LogOut,
  FolderOpen, ShoppingBag, Menu, Wifi, WifiOff,
  Radio, Layers, Stethoscope, Bot, Rocket,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/mock/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnline } from "@/hooks/useOnline";
import { PubliVendeMark } from "@/components/PubliVendeLogo";

const CLIENT_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/diagnostico", label: "Diagnóstico IA", icon: Stethoscope },
  { to: "/piloto", label: "Piloto automático", icon: Bot },
  { to: "/publicar", label: "Crear publicación", icon: PlusSquare },
  { to: "/biblioteca", label: "Biblioteca", icon: FolderOpen },
  { to: "/distribuir", label: "Distribución", icon: Radio },
  { to: "/calendario", label: "Calendario", icon: Calendar },
  { to: "/whatsapp", label: "WhatsApp CRM", icon: MessageCircle },
  { to: "/productos", label: "Productos", icon: ShoppingBag },
  { to: "/automatizaciones", label: "Automatizaciones", icon: Zap },
  { to: "/analiticas", label: "Analíticas", icon: BarChart3 },
  { to: "/configuracion", label: "Configuración", icon: Settings },
] as const;

const MOBILE_TABS = [
  { to: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { to: "/publicar", label: "Publicar", icon: PlusSquare },
  { to: "/diagnostico", label: "IA", icon: Stethoscope },
  { to: "/whatsapp", label: "CRM", icon: MessageCircle },
  { to: "/configuracion", label: "Ajustes", icon: Settings },
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
    <div className="min-h-screen flex w-full bg-zinc-950 text-zinc-100 antialiased selection:bg-violet-500/30 selection:text-violet-200">
      {/* Mobile trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-3 left-3 z-50 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 shadow-xl backdrop-blur-md"
        aria-label="Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar Linear-style */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-40 w-[80vw] max-w-64 bg-zinc-950/95 md:bg-zinc-950 border-r border-zinc-800/80 flex flex-col transition-transform duration-200 backdrop-blur-xl md:backdrop-blur-none",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
              <span className="font-black text-white text-sm tracking-tight">P</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-zinc-100 flex items-center gap-1.5">
                PubliVende <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">AI</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {user.is_admin ? "Centro Administrador" : `Espacio · ${user.plan.toUpperCase()}`}
              </span>
            </div>
          </Link>
        </div>

        {/* System Health Pill */}
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/60 text-[11px] text-zinc-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="truncate">MeAI (Claude) · Mercado Pago</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 custom-scrollbar">
          <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
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
                    ? "bg-violet-600/15 text-violet-300 border border-violet-500/25 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60",
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0 transition-colors", active ? "text-violet-400" : "text-zinc-400 group-hover:text-zinc-300")} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {user.is_admin && (
            <>
              <div className="pt-4 pb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Super Admin
              </div>
              <Link
                to="/red"
                onClick={closeMenu}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  isActive("/red")
                    ? "bg-violet-600/15 text-violet-300 border border-violet-500/25"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60",
                )}
              >
                <Rocket className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Red PubliVende</span>
              </Link>
              <Link
                to="/plataforma"
                onClick={closeMenu}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  isActive("/plataforma")
                    ? "bg-violet-600/15 text-violet-300 border border-violet-500/25"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60",
                )}
              >
                <Layers className="w-4 h-4 shrink-0 text-cyan-400" />
                <span>Plataforma API</span>
              </Link>
            </>
          )}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/50">
          <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1 rounded-lg bg-zinc-900/50 border border-zinc-800/40">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-zinc-200 truncate flex items-center gap-1.5">
                {user.nombre}
                {online ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="En línea" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Offline" />
                )}
              </div>
              <div className="text-[10px] text-zinc-400 truncate">
                {user.nombre_negocio || "Mi Negocio"}
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {open && <div onClick={() => setOpen(false)} className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-30" />}

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto pt-16 md:pt-8 pb-24 md:pb-12">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl pb-[max(env(safe-area-inset-bottom),8px)]">
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
                  active ? "text-violet-400 font-semibold" : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
