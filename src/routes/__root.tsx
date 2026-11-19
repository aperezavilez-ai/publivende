import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { type ReactNode, useEffect, useState } from "react";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/mock/auth";
import { Toaster } from "@/components/ui/sonner";
import { registerPWA } from "@/lib/registerPWA";

const SITE_URL = "https://www.publivende.mx";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PubliVende",
  url: SITE_URL,
  logo: `${SITE_URL}/logo-publivende.png`,
  description:
    "Plataforma todo-en-uno para creadores y pymes de LATAM: publicación multi-red (Instagram, TikTok, Facebook, YouTube) y ventas por WhatsApp con IA.",
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#7C3AED" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "PubliVende" },
      { title: "PubliVende — Publica en todas tus redes y vende por WhatsApp" },
      { name: "description", content: "La herramienta todo-en-uno para creadores y pymes de LATAM. Publica en Instagram, TikTok, Facebook y YouTube + CRM de WhatsApp con IA." },
      { name: "facebook-domain-verification", content: "rm93pfvri9a9ro4v6ltnwjzi0im7bs" },
      // Open Graph (sitio completo)
      { property: "og:site_name", content: "PubliVende" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:image", content: `${SITE_URL}/logo-publivende.png` },
      { property: "og:locale", content: "es_MX" },
      // Twitter Card
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PubliVende — Publica en todas tus redes y vende por WhatsApp" },
      { name: "twitter:description", content: "Publicación multi-red + vendedor IA por WhatsApp. Planes desde $0 MXN/mes." },
      { name: "twitter:image", content: `${SITE_URL}/logo-publivende.png` },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/logo-publivende.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/logo-publivende.png" },
      { rel: "canonical", href: `${SITE_URL}/` },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(organizationJsonLd),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

/**
 * Dominio canónico ÚNICO. La sesión vive en el almacenamiento del dominio
 * donde entraste: si el usuario entra por un alias (publivende.mx sin www
 * o publivende.vercel.app), los regresos de OAuth (Meta, Google, TikTok) y
 * de Mercado Pago caen en www.publivende.mx y la app «pierde» su sesión.
 * Aquí toda carga de página en un alias se mueve al dominio oficial con la
 * misma ruta; las llamadas API/cron no pasan por este componente.
 */
const CANONICAL_HOST = "www.publivende.mx";
const ALIAS_HOSTS = new Set(["publivende.mx", "publivende.vercel.app"]);

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [wrongHost, setWrongHost] = useState(false);
  useEffect(() => { registerPWA(); }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (ALIAS_HOSTS.has(window.location.hostname)) {
      setWrongHost(true);
      const target = `https://${CANONICAL_HOST}${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(target);
    }
  }, []);
  if (wrongHost) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-right" richColors />
        {import.meta.env.DEV && <TanStackRouterDevtools />}
      </AuthProvider>
    </QueryClientProvider>
  );
}
