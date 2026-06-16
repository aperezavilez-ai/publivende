# PubliVende — Pasar de demo a producción

## Resumen

La app funciona en **dos modos**:

| Modo | Cuándo | Qué pasa |
|------|--------|----------|
| **Demo** | Sin `DATABASE_URL` | Datos en `localStorage`, publicación simulada |
| **Producción** | Con `DATABASE_URL` + `SESSION_SECRET` | Auth real, tokens en servidor, APIs reales |

---

## Paso 1 — Base de datos (Supabase recomendado)

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Copia la **Connection string** (URI Postgres)
3. En Vercel → Settings → Environment Variables:

```
DATABASE_URL=postgresql://...
SESSION_SECRET=genera-un-secreto-largo-aleatorio-min-32-chars
```

4. Genera y aplica migraciones (local):

```bash
npx drizzle-kit generate
npm run db:migrate
```

---

## Paso 2 — OAuth (ya parcialmente listo)

Variables en Vercel (ya las tienes en `.env`):

```
VITE_APP_URL=https://publivende.mx
OAUTH_STATE_SECRET=...
META_APP_ID=...
META_APP_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
```

En producción los tokens OAuth se guardan en **Postgres**, no en el navegador.

Redirect URIs (agregar en Meta / Google / TikTok):

```
https://publivende.mx/oauth/callback/meta
https://publivende.mx/oauth/callback/google
https://publivende.mx/oauth/callback/tiktok
```

---

## Paso 3 — Publicación real en redes

Con cuentas conectadas vía OAuth, al publicar la app llama:

- **Facebook** → Graph API `/{page-id}/feed`
- **Instagram** → Graph API media + publish
- **TikTok** → Content Posting API
- **YouTube** → Resumable upload

Requisitos Meta:
- App en modo Live
- Permisos: `pages_manage_posts`, `instagram_content_publish`, etc.
- Page ID / IG Business Account ID en el token OAuth

---

## Paso 4 — WhatsApp (multi-usuario)

Cada cliente conecta **su** WhatsApp Business desde Configuración → "Conectar mi WhatsApp" (Embedded Signup).

### 4a — Webhook de plataforma (una sola URL)

```
https://www.publivende.mx/api/webhook/whatsapp
```

Verify token: `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (ej. `publivende_verify`)

### 4b — Embedded Signup (obligatorio para clientes)

1. Meta Developers → tu app → **WhatsApp** → **Embedded Signup**
2. Crea una **Configuration** y copia el **Configuration ID**
3. En Vercel:

```
WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID=1234567890123456
META_APP_ID=...          # ya lo tienes
META_APP_SECRET=...      # ya lo tienes
```

4. Ejecuta migración (tabla `whatsapp_accounts`):

```bash
npm run db:migrate
```

### 4c — Fallback admin (opcional, legacy)

Solo para pruebas con un número de plataforma:

```
WHATSAPP_TOKEN=EAAxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_DEFAULT_USER_ID=uuid-del-usuario-admin
```

En producción normal, **cada usuario** guarda su token en `whatsapp_accounts` al conectar.

---

## Paso 5 — IA real (OpenAI)

```
OPENAI_API_KEY=sk-...
```

Activa: captions, respuestas WhatsApp contextuales sobre publicaciones.

---

## Paso 6 — Pagos reales (Stripe)

```
STRIPE_SECRET_KEY=sk_live_...
```

Genera links de cobro reales (Checkout) en WhatsApp CRM y Productos.

Mercado Pago queda como opción secundaria si defines `MERCADOPAGO_ACCESS_TOKEN`.

---

## Paso 7 — Deploy

```bash
npx vercel deploy --prod --yes --name publivende
```

Verifica en la app: si producción está activa, login usa servidor y no guarda contraseñas en localStorage.

---

## Checklist rápido

- [ ] `DATABASE_URL` + `SESSION_SECRET` en Vercel
- [ ] `npm run db:migrate` ejecutado contra la BD
- [ ] OAuth Meta/Google/TikTok en Live
- [ ] `WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID` + webhook verificado
- [ ] Migración `whatsapp_accounts` aplicada
- [ ] `OPENAI_API_KEY` (opcional pero recomendado)
- [ ] `STRIPE_SECRET_KEY` (opcional)
- [ ] `MERCADOPAGO_ACCESS_TOKEN` (opcional, LATAM)
- [ ] Redeploy en Vercel

---

## Qué sigue en demo (P2)

- Google Ads API real
- Cobro de planes PubliVende (Stripe suscripciones)
- Import real de tiendas (Shopify, ML)
- Bandeja unificada con APIs de comentarios/DM
- Transcripción de voz (Whisper)
