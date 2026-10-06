import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => { registerPWA(); }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
