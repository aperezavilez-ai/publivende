# PubliVende

Plataforma todo-en-uno para creadores y pymes de LATAM: publica contenido en
Instagram, TikTok, Facebook y YouTube desde un solo panel, y vende por
WhatsApp con un vendedor IA conectado a tu catálogo.

## Stack

- **Frontend + SSR:** React 19 + TanStack Start (TanStack Router) + Vite 7
- **UI:** Tailwind CSS 4 + shadcn/ui (Radix)
- **Base de datos:** Postgres (Supabase/Neon) + Drizzle ORM
- **Pagos:** Stripe (principal) + MercadoPago (opcional)
- **IA:** OpenAI-compatible (MeAI)
- **Deploy:** Vercel (`vercel.json` incluye crons de publicación, métricas y autopilot)

## Arranque rápido

```bash
npm install
cp .env.example .env   # completa las variables
npm run dev            # http://localhost:8083
```

## Scripts útiles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run db:generate` | Generar migraciones Drizzle |
| `npm run db:migrate` | Aplicar migraciones |

## Variables de entorno clave

Ver `.env.example`. Las mínimas para producción:

- `VITE_APP_URL` — URL pública (https://www.publivende.mx)
- `DATABASE_URL` — Postgres
- `SESSION_SECRET`, `OAUTH_STATE_SECRET` — secretos de sesión
- `META_APP_ID` / `META_APP_SECRET` — Meta (Facebook/Instagram/WhatsApp)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — YouTube
- `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` — TikTok
- `WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID` — Embedded Signup por cliente
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`
- `MEAI_API_KEY` — IA

## Estructura

- `src/routes/` — rutas (landing, app `/dashboard`, `/publicar`, API routes, webhooks)
- `src/server/` — lógica de servidor (publicación, WhatsApp, pagos, métricas, partners)
- `src/lib/` — utilidades compartidas y configuración
- `src/components/` — componentes UI
- `drizzle/` — migraciones SQL
- `supabase/` — config y edge functions

## Notas de producto

- Los precios de planes viven en `src/lib/plans.ts` (y pueden sobrescribirse
  con `STRIPE_PRICE_PRO` / `STRIPE_PRICE_BUSINESS`).
- Los testimonios de la landing deben sustituirse por casos reales verificables
  antes de hacer campaña de adquisición.
- Tras cambiar la landing o el SEO, forzar redeploy en Vercel y enviar el
  sitemap en Google Search Console.
