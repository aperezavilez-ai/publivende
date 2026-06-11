import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/mock/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PricingPlans } from "@/components/PricingPlans";
import { Sparkles, Upload, Share2, MessageCircle, Star, Instagram, Facebook, Youtube, Music2, Zap, BarChart3, Bot } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PubliVende — Planes y publicación multi-red" },
      { name: "description", content: "Elige tu plan, crea tu cuenta y publica en Instagram, TikTok, Facebook y YouTube con IA." },
      { property: "og:title", content: "PubliVende" },
      { property: "og:description", content: "Planes para creadores y pymes LATAM. Publica en todas tus redes y vende por WhatsApp." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    navigate({ to: user.onboarding_completado ? "/dashboard" : "/onboarding" });
  }, [user, loading, navigate]);

  if (!loading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Entrando a tu panel…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">PubliVende</span>
          </Link>
          <Link to="/auth" search={{ mode: "login", plan: "free" }}>
            <Button variant="outline" size="sm">Ya tengo cuenta — Iniciar sesión</Button>
          </Link>
        </div>
      </header>

      {/* Planes primero */}
      <section id="precios" className="relative py-16 md:py-20">
        <div className="absolute inset-0 bg-gradient-hero opacity-[0.07]" />
        <div className="relative max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold mb-4">
              <Sparkles className="w-3 h-3" /> Paso 1 — Elige tu plan
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto">
              Publica en todas tus redes y vende por <span className="text-gradient">WhatsApp</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Selecciona un paquete y crea tu cuenta. Al registrarte accedes al panel para conectar redes, importar posts y publicar con IA.
            </p>
          </div>
          <PricingPlans signupLinks />
          <p className="text-center text-xs text-muted-foreground mt-6">
            Todos los planes incluyen prueba sin tarjeta · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* Valor rápido */}
      <section className="py-12 border-y bg-muted/20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground mb-4">Después del registro</p>
          <div className="flex flex-wrap justify-center gap-6 text-muted-foreground">
            <Instagram className="w-6 h-6" />
            <Music2 className="w-6 h-6" />
            <Facebook className="w-6 h-6" />
            <Youtube className="w-6 h-6" />
            <MessageCircle className="w-6 h-6 text-whatsapp" />
          </div>
          <p className="mt-4 text-sm">
            Onboarding guiado → conectas tus redes → importas un link → publicas en el panel
          </p>
        </div>
      </section>

      <section id="como-funciona" className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold">En 3 pasos, contenido a ventas</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { i: Upload, t: "1. Importa o crea", d: "Pega el link de un post o sube media. La IA adapta el copy por red." },
              { i: Share2, t: "2. Publica en todas", d: "Instagram, TikTok, Facebook y YouTube desde un solo panel." },
              { i: MessageCircle, t: "3. Vende por WhatsApp", d: "CRM, automatizaciones y catálogo con respuestas IA." },
            ].map((s) => (
              <Card key={s.t} className="p-6 hover:shadow-elegant transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
                  <s.i className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Lo que nadie más hace</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { i: BarChart3, t: "Atribución contenido → venta", d: "Cada post genera un link/QR único de WhatsApp." },
              { i: Bot, t: "Vendedor IA con tu catálogo", d: "Responde, recomienda y manda link de pago 24/7." },
              { i: Zap, t: "Recetas por industria LATAM", d: "Ropa, belleza, comida… Listo en minutos." },
            ].map((d) => (
              <div key={d.t} className="text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-accent flex items-center justify-center mb-4">
                  <d.i className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-bold mb-2">{d.t}</h3>
                <p className="text-sm text-muted-foreground">{d.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonios" className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Negocios que ya venden con PubliVende</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "Laura M.", b: "Boutique en CDMX", t: "Pasé de 3h diarias a 20 min para todas mis redes." },
              { n: "Andrés P.", b: "Cafetería en Medellín", t: "El vendedor IA me responde el menú a las 11pm." },
              { n: "Sofía R.", b: "Coach en Buenos Aires", t: "Supe qué Reel me trajo más ventas." },
            ].map((t) => (
              <Card key={t.n} className="p-6">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-sm mb-4">"{t.t}"</p>
                <div className="text-sm">
                  <div className="font-semibold">{t.n}</div>
                  <div className="text-muted-foreground text-xs">{t.b}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-t">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-2">¿Listo para empezar?</h2>
          <p className="text-muted-foreground mb-6">Elige tu plan arriba y crea tu cuenta en menos de 2 minutos.</p>
          <a href="#precios">
            <Button size="lg" className="bg-gradient-primary border-0 shadow-elegant">
              Ver planes
            </Button>
          </a>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © 2026 PubliVende. Hecho con 💜 para LATAM.
      </footer>
    </div>
  );
}
