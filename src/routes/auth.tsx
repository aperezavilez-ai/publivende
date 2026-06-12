import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/mock/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { isValidPlan, planLabel, PLAN_OFFERS } from "@/lib/plans";
import type { Plan } from "@/lib/mock/types";
import { PubliVendeLogo } from "@/components/PubliVendeLogo";

const PAISES = [
  { code: "+52", name: "México 🇲🇽" }, { code: "+57", name: "Colombia 🇨🇴" }, { code: "+54", name: "Argentina 🇦🇷" },
  { code: "+56", name: "Chile 🇨🇱" }, { code: "+51", name: "Perú 🇵🇪" }, { code: "+58", name: "Venezuela 🇻🇪" },
  { code: "+593", name: "Ecuador 🇪🇨" }, { code: "+502", name: "Guatemala 🇬🇹" }, { code: "+591", name: "Bolivia 🇧🇴" }, { code: "+1", name: "USA 🇺🇸" },
];

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode as string) === "signup" ? "signup" as const : "login" as const,
    plan: isValidPlan(s.plan) ? s.plan : ("free" as Plan),
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initMode, plan: selectedPlan } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup">(initMode === "signup" ? "signup" : "login");
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [loadingForm, setLoadingForm] = useState(false);
  const [form, setForm] = useState({
    nombre: "", email: "", password: "", codigo_pais: "+52", celular: "", nombre_negocio: "",
  });

  const planOffer = PLAN_OFFERS.find((p) => p.id === selectedPlan) ?? PLAN_OFFERS[0];

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: user.onboarding_completado ? "/dashboard" : "/onboarding" });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    setMode(initMode === "signup" ? "signup" : "login");
  }, [initMode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoadingForm(true);
    try {
      if (mode === "login") {
        const loggedIn = await signIn(form.email, form.password);
        toast.success("¡Bienvenido de vuelta!");
        navigate({ to: loggedIn.onboarding_completado ? "/dashboard" : "/onboarding" });
      } else {
        const profile = await signUp({ ...form, plan: selectedPlan });
        toast.success(`Cuenta creada con plan ${planLabel(profile.plan)} 🎉`);
        navigate({ to: "/onboarding" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoadingForm(false);
    }
  }

  if (!loading && user) {
    return <div className="min-h-screen flex items-center justify-center text-white/80">Redirigiendo al panel…</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <PubliVendeLogo to="/" size="lg" textClassName="text-white text-xl" />
          <a href="/#precios">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 gap-1">
              <ArrowLeft className="w-4 h-4" />
              Planes
            </Button>
          </a>
        </div>
        <Card className="p-6 shadow-elegant">
          <h1 className="text-2xl font-bold">{mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? "Accede a tu panel" : "Paso 2 — completa tus datos"}
          </p>
          {mode === "signup" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge className="bg-gradient-primary border-0">
                Plan {planOffer.nombre} — {planOffer.precio} MXN/mes
              </Badge>
              <a href="/#precios" className="text-xs text-primary hover:underline">
                Cambiar plan
              </a>
            </div>
          )}
          <form onSubmit={submit} className="mt-5 space-y-3">
            {mode === "signup" && (
              <>
                <div><Label>Tu nombre</Label><Input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
                <div><Label>Nombre del negocio</Label><Input required value={form.nombre_negocio} onChange={(e) => setForm({ ...form, nombre_negocio: e.target.value })} /></div>
              </>
            )}
            <div><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Contraseña</Label><Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            {mode === "signup" && (
              <div>
                <Label>Celular (para WhatsApp Business)</Label>
                <div className="flex gap-2">
                  <Select value={form.codigo_pais} onValueChange={(v) => setForm({ ...form, codigo_pais: v })}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{PAISES.map((p) => <SelectItem key={p.code} value={p.code}>{p.name} {p.code}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input required placeholder="5512345678" value={form.celular} onChange={(e) => setForm({ ...form, celular: e.target.value })} />
                </div>
              </div>
            )}
            <Button type="submit" disabled={loadingForm} className="w-full bg-gradient-primary border-0 shadow-elegant">
              {loadingForm ? "..." : mode === "login" ? "Entrar al panel" : "Crear cuenta y continuar"}
            </Button>
          </form>
          <div className="text-center text-sm mt-4 text-muted-foreground">
            {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
            {mode === "login" ? (
              <a href="/#precios" className="text-primary font-semibold hover:underline">
                Elige un plan
              </a>
            ) : (
              <button type="button" onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">
                Iniciar sesión
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
