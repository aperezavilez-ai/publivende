import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, PlusSquare, Calendar, MessageCircle, Zap, BarChart3, Settings, LogOut, FolderOpen, Inbox, ShoppingBag, ChefHat, Menu, Megaphone, Brain, Target, Wifi, WifiOff, FlaskConical, Layers } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/mock/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnline } from "@/hooks/useOnline";
import { PubliVendeMark } from "@/components/PubliVendeLogo";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/publicar", label: "Crear publicación", icon: PlusSquare },
  { to: "/biblioteca", label: "Biblioteca", icon: FolderOpen },
  { to: "/calendario", label: "Calendario", icon: Calendar },
  { to: "/whatsapp", label: "WhatsApp CRM", icon: MessageCircle },
  { to: "/bandeja", label: "Bandeja unificada", icon: Inbox },
  { to: "/automatizaciones", label: "Automatizaciones", icon: Zap },
  { to: "/anuncios", label: "Anuncios (Google Ads)", icon: Megaphone },
  { to: "/experimentos", label: "A/B testing", icon: FlaskConical },
  { to: "/coach", label: "Coach IA semanal", icon: Brain },
  { to: "/inteligencia", label: "Inteligencia competitiva", icon: Target },
  { to: "/productos", label: "Productos", icon: ShoppingBag },
  { to: "/recetas", label: "Recetas LATAM", icon: ChefHat },
  { to: "/analiticas", label: "Analíticas", icon: BarChart3 },
  { to: "/configuracion", label: "Configuración", icon: Settings },
] as const;

const MOBILE_TABS = [
  { to: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { to: "/publicar", label: "Publicar", icon: PlusSquare },
  { to: "/calendario", label: "Calendario", icon: Calendar },
  { to: "/whatsapp", label: "CRM", icon: MessageCircle },
  { to: "/configuracion", label: "Ajustes", icon: Settings },
] as const;

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

  return (
    <div className="min-h-screen flex w-full bg-muted/30">
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-3 left-3 z-50 p-2.5 rounded-lg bg-card border shadow-soft"
      >
        <Menu className="w-5 h-5" />
      </button>

      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-40 w-[82vw] max-w-72 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-5 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex flex-col gap-1">
            <PubliVendeMark size="sm" />
            <div className="text-[10px] text-muted-foreground">Plan {user.plan}</div>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to} to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
          {user.is_admin && (
            <Link
              to="/plataforma"
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5",
                pathname === "/plataforma"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Layers className="w-4 h-4 shrink-0" />
              Plataforma API
            </Link>
          )}
        </nav>
        <div className="p-3 border-t border-sidebar-border pb-[max(env(safe-area-inset-bottom),12px)]">
          <div className="flex items-center gap-2 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate flex items-center gap-1">
                {user.nombre}
                {online
                  ? <Wifi className="w-3 h-3 text-green-500" />
                  : <WifiOff className="w-3 h-3 text-amber-500" />}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">{online ? user.nombre_negocio : "Modo offline · sincronizando"}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      {open && <div onClick={() => setOpen(false)} className="md:hidden fixed inset-0 bg-black/40 z-30" />}

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="p-3 md:p-8 max-w-7xl mx-auto pt-16 md:pt-8 pb-24 md:pb-8">
          {children}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 pb-[max(env(safe-area-inset-bottom),8px)]">
        <div className="grid grid-cols-5 px-1 pt-1">
          {MOBILE_TABS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg text-[11px]",
                  active
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground",
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
