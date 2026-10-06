import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/mock/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PricingPlans } from "@/components/PricingPlans";
import { PubliVendeLogo } from "@/components/PubliVendeLogo";
import { Sparkles, Upload, Share2, MessageCircle, Star, Instagram, Facebook, Youtube, Music2, Zap, BarChart3, Bot, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PubliVende — Publica en Instagram, TikTok, Facebook y YouTube y vende por WhatsApp" },
      { name: "description", content: "Publica contenido en todas tus redes desde un solo panel, conecta tu WhatsApp y convierte seguidores en ventas. Hecho para creadores y pymes de LATAM." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.publivende.mx/" },
      { property: "og:title", content: "PubliVende — De contenido a ventas en un solo panel" },
      { property: "og:description", content: "Publica en Instagram, TikTok, Facebook y YouTube, y vende por WhatsApp con IA. Planes desde $0 MXN/mes." },
      { property: "og:image", content: "https://www.publivende.mx/logo-publivende.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    navigate({ to: "/dashboard" });
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
          <PubliVendeLogo to="/" size="sm" showText />
          <div className="flex items-center gap-2">
            <a href="#precios" className="hidden md:inline-block text-sm text-muted-foreground hover:text-foreground px-3">
              Planes
            </a>
            <a href="#como-funciona" className="hidden md:inline-block text-sm text-muted-foreground hover:text-foreground px-3">
              Cómo funciona
            </a>
            <a href="#faq" className="hidden md:inline-block text-sm text-muted-foreground hover:text-foreground px-3">
              FAQ
            </a>
            <Link to="/auth" search={{ mode: "login", plan: "free" }}>
              <Button variant="outline" size="sm">Iniciar sesión</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO — propuesta de valor primero, precios después */}
      <section className="relative py-16 md:py-24">
        <div className="absolute inset-0 bg-gradient-hero opacity-[0.07]" />
        <div className="relative max-w-6xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold mb-5">
            <Sparkles className="w-3 h-3" /> Publicación multi-red + WhatsApp con IA
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto">
            Publica en todas tus redes y vende por <span className="text-[#25D366]">WhatsApp</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
            Un solo panel para crear, programar y publicar en Instagram, TikTok, Facebook y YouTube — y un vendedor IA que atiende tus clientes por WhatsApp 24/7.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup", plan: "free" }}>
              <Button size="lg" className="bg-gradient-primary border-0 shadow-elegant w-full sm:w-auto">
                Empezar gratis <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <a href="#como-funciona">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Ver cómo funciona
              </Button>
            </a>
          </div>
          <div className="mt-8 flex flex-wrap justify-center items-center gap-5 text-muted-foreground">
            <Instagram className="w-6 h-6" />
            <Music2 className="w-6 h-6" />
            <Facebook className="w-6 h-6" />
            <Youtube className="w-6 h-6" />
            <MessageCircle className="w-6 h-6 text-[#25D366]" />
            <span className="text-xs w-full sm:w-auto mt-2 sm:mt-0">
              Sin tarjeta · Listo en minutos · Cancela cuando quieras
            </span>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="py-20 bg-muted/30 border-y">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold">En 3 pasos, contenido a ventas</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Onboarding guiado: conectas tus redes, importas un link y publicas desde el panel.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 hover:shadow-elegant transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">1. Importa o crea</h3>
              <p className="text-sm text-muted-foreground">Pega el link de un post o sube media. La IA adapta el copy por red.</p>
            </Card>
            <Card className="p-6 hover:shadow-elegant transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">2. Publica en todas</h3>
              <p className="text-sm text-muted-foreground">Instagram, TikTok, Facebook y YouTube desde un solo panel.</p>
            </Card>
            <Card className="p-6 hover:shadow-elegant transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">3. Vende por <span className="text-[#25D366]">WhatsApp</span></h3>
              <p className="text-sm text-muted-foreground">CRM, automatizaciones y catálogo con respuestas IA.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* DIFERENCIADORES */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Lo que nadie más hace</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-accent flex items-center justify-center mb-4">
                <BarChart3 className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-bold mb-2">Atribución contenido → venta</h3>
              <p className="text-sm text-muted-foreground">
                Cada post genera un link/QR único de <span className="text-[#25D366] font-medium">WhatsApp</span>, para saber qué contenido vende.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-accent flex items-center justify-center mb-4">
                <Bot className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-bold mb-2">Vendedor IA con tu catálogo</h3>
              <p className="text-sm text-muted-foreground">Responde, recomienda y manda link de pago 24/7.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-accent flex items-center justify-center mb-4">
                <Zap className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-bold mb-2">Recetas por industria LATAM</h3>
              <p className="text-sm text-muted-foreground">Ropa, belleza, comida… Listo en minutos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section id="testimonios" className="py-20 bg-muted/30 border-y">
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

      {/* PRECIOS — después de que entienden el valor */}
      <section id="precios" className="relative py-20">
        <div className="absolute inset-0 bg-gradient-hero opacity-[0.07]" />
        <div className="relative max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold">Planes que crecen contigo</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Empieza gratis, actualiza cuando necesites más redes, conversaciones y automatización.
            </p>
          </div>
          <PricingPlans signupLinks />
          <p className="text-center text-xs text-muted-foreground mt-6">
            Todos los planes incluyen prueba sin tarjeta · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-muted/30 border-y">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {[
              { q: "¿Necesito tarjeta para empezar?", a: "No. El plan Free no requiere tarjeta y puedes probar la plataforma completa antes de decidir un plan de pago." },
              { q: "¿En qué redes puedo publicar?", a: "Instagram, TikTok, Facebook y YouTube desde un solo panel. El plan Free incluye 1 red; Pro y Business incluyen las 4." },
              { q: "¿Cómo funciona el vendedor IA de WhatsApp?", a: "Conectas tu número de WhatsApp (Embedded Signup de Meta), subes tu catálogo y la IA responde a tus clientes, recomienda productos y envía links de pago automáticamente." },
              { q: "¿Puedo cancelar cuando quiera?", a: "Sí, todos los planes son de suscripción mensual sin permanencia. Cancelas desde tu panel en segundos." },
            ].map((f) => (
              <details key={f.q} className="group bg-background rounded-lg border px-5 py-4">
                <summary className="flex items-center justify-between cursor-pointer list-none font-medium text-sm">
                  {f.q}
                  <ArrowRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold mb-2">¿Listo para empezar?</h2>
          <p className="text-muted-foreground mb-6">Crea tu cuenta en menos de 2 minutos y publica tu primer post hoy.</p>
          <Link to="/auth" search={{ mode: "signup", plan: "free" }}>
            <Button size="lg" className="bg-gradient-primary border-0 shadow-elegant">
              Empezar gratis <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground space-y-2">
        <p>© 2026 PubliVende. Hecho con 💜 para LATAM.</p>
        <p>
          <Link to="/terminos" className="hover:underline text-primary">Términos de servicio</Link>
          {" · "}
          <Link to="/privacidad" className="hover:underline text-primary">Política de privacidad</Link>
        </p>
      </footer>
    </div>
  );
}
