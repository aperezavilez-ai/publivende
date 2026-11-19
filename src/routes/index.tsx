import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/mock/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PricingPlans } from "@/components/PricingPlans";
import { PubliVendeLogo } from "@/components/PubliVendeLogo";
import { Upload, Share2, MessageCircle, Instagram, Facebook, Youtube, Music2, ArrowRight, CheckCircle2, CalendarClock, Link2, Bot, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PubliVende — Publica en Instagram, TikTok, Facebook y YouTube y vende por WhatsApp" },
      { name: "description", content: "Publica contenido en todas tus redes desde un solo panel, conecta tu WhatsApp y convierte seguidores en ventas. Hecho para creadores y pymes de LATAM." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://publivende.mx/" },
      { property: "og:title", content: "PubliVende — De contenido a ventas en un solo panel" },
      { property: "og:description", content: "Publica en Instagram, TikTok, Facebook y YouTube, y vende por WhatsApp. Planes desde $0 MXN/mes." },
      { property: "og:image", content: "https://publivende.mx/logo-publivende.png" },
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
      <div className="min-h-screen flex items-center justify-center text-muted-foreground bg-white">
        Entrando a tu panel…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <PubliVendeLogo to="/" size="sm" showText />
          <div className="flex items-center gap-2">
            <a href="#precios" className="hidden md:inline-block text-sm text-slate-600 hover:text-slate-900 px-3">
              Planes
            </a>
            <a href="#como-funciona" className="hidden md:inline-block text-sm text-slate-600 hover:text-slate-900 px-3">
              Cómo funciona
            </a>
            <a href="#faq" className="hidden md:inline-block text-sm text-slate-600 hover:text-slate-900 px-3">
              FAQ
            </a>
            <Link to="/auth" search={{ mode: "login", plan: "free" }}>
              <Button variant="outline">Iniciar sesión</Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup", plan: "free" }} className="hidden sm:block">
              <Button>Crear cuenta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm font-semibold text-blue-700 mb-4">Publicación multi-red + WhatsApp</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight max-w-3xl mx-auto">
            Publica en todas tus redes desde un solo panel
          </h1>
          <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
            Crea, programa y publica en Instagram, TikTok, Facebook y YouTube, y atiende a tus clientes por WhatsApp desde el mismo lugar.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup", plan: "free" }}>
              <Button size="lg" className="w-full sm:w-auto">
                Crear cuenta gratis <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <a href="#como-funciona">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Ver cómo funciona
              </Button>
            </a>
          </div>
          <div className="mt-10 flex flex-wrap justify-center items-center gap-5 text-slate-500">
            <Instagram className="w-6 h-6" />
            <Music2 className="w-6 h-6" />
            <Facebook className="w-6 h-6" />
            <Youtube className="w-6 h-6" />
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs w-full sm:w-auto mt-2 sm:mt-0">
              Sin tarjeta · Cancela cuando quieras
            </span>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold">En 3 pasos, contenido a ventas</h2>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
              Conectas tus redes, importas un link o subes tu contenido y publicas desde el panel.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 bg-white">
              <div className="w-12 h-12 rounded-lg bg-blue-700 flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">1. Importa o crea</h3>
              <p className="text-sm text-slate-600">Pega el link de un post o sube tu imagen o video. Puedes adaptar el texto para cada red.</p>
            </Card>
            <Card className="p-6 bg-white">
              <div className="w-12 h-12 rounded-lg bg-blue-700 flex items-center justify-center mb-4">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">2. Publica o programa</h3>
              <p className="text-sm text-slate-600">Instagram, TikTok, Facebook y YouTube desde un solo panel, al momento o en la fecha que elijas.</p>
            </Card>
            <Card className="p-6 bg-white">
              <div className="w-12 h-12 rounded-lg bg-blue-700 flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">3. Vende por WhatsApp</h3>
              <p className="text-sm text-slate-600">CRM, automatizaciones y catálogo para atender a tus clientes por WhatsApp.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* QUÉ INCLUYE — capacidades del producto, sin prueba social inventada */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Qué incluye</h2>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
              Las funciones del panel, tal como están construidas.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-slate-200 rounded-lg p-6">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
                <CalendarClock className="w-6 h-6 text-blue-700" />
              </div>
              <h3 className="font-bold mb-2">Publicación y programación</h3>
              <p className="text-sm text-slate-600">
                Publica al momento o programa en Facebook, Instagram, TikTok y YouTube conectando tus propias cuentas.
              </p>
            </div>
            <div className="border border-slate-200 rounded-lg p-6">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
                <Link2 className="w-6 h-6 text-blue-700" />
              </div>
              <h3 className="font-bold mb-2">Enlace rastreable por publicación</h3>
              <p className="text-sm text-slate-600">
                Cada post genera un enlace único de WhatsApp, para saber qué contenido trae conversaciones.
              </p>
            </div>
            <div className="border border-slate-200 rounded-lg p-6">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-blue-700" />
              </div>
              <h3 className="font-bold mb-2">Respuestas asistidas en WhatsApp</h3>
              <p className="text-sm text-slate-600">Responde, recomienda productos de tu catálogo y envía links de pago desde el CRM.</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-6">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-blue-700" />
              </div>
              <h3 className="font-bold mb-2">Analíticas de tus publicaciones</h3>
              <p className="text-sm text-slate-600">Consulta el rendimiento de lo que publicaste desde el mismo panel.</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-6">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
                <Share2 className="w-6 h-6 text-blue-700" />
              </div>
              <h3 className="font-bold mb-2">Tus cuentas, tus conexiones</h3>
              <p className="text-sm text-slate-600">Conectas tus redes con el acceso oficial de cada plataforma y puedes desconectarlas cuando quieras.</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-6">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-blue-700" />
              </div>
              <h3 className="font-bold mb-2">CRM de WhatsApp</h3>
              <p className="text-sm text-slate-600">Contactos, etapas de venta y automatizaciones básicas en un solo lugar.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRECIOS */}
      <section id="precios" className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold">Planes que crecen contigo</h2>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
              Empieza gratis, actualiza cuando necesites más redes, conversaciones y automatización.
            </p>
          </div>
          <PricingPlans signupLinks />
          <p className="text-center text-xs text-slate-500 mt-6">
            Todos los planes incluyen prueba sin tarjeta · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-white">
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
              <details key={f.q} className="group bg-white rounded-lg border border-slate-200 px-5 py-4">
                <summary className="flex items-center justify-between cursor-pointer list-none font-medium text-sm">
                  {f.q}
                  <ArrowRight className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <CheckCircle2 className="w-10 h-10 text-blue-700 mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold mb-2">¿Listo para empezar?</h2>
          <p className="text-slate-600 mb-6">Crea tu cuenta y publica tu primer post hoy.</p>
          <Link to="/auth" search={{ mode: "signup", plan: "free" }}>
            <Button size="lg">
              Crear cuenta gratis <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 space-y-2 bg-white">
        <p>© 2026 PubliVende.</p>
        <p>
          <Link to="/terminos" className="hover:underline text-blue-700">Términos de servicio</Link>
          {" · "}
          <Link to="/privacidad" className="hover:underline text-blue-700">Política de privacidad</Link>
        </p>
      </footer>
    </div>
  );
}
