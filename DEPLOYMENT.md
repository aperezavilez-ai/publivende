# Guía de Despliegue de Publivende en Vercel

## ✅ Cambios Realizados

### 1. Resolución de Conflictos de Rutas
- ✅ Eliminados archivos duplicados de rutas planas (`calendario.tsx`, `dashboard.tsx`, `productos.tsx`, `whatsapp.tsx`)
- ✅ Mantenida la estructura con prefijo `_app.` que representa las rutas reales
- ✅ Build completado exitosamente sin conflictos

### 2. Configuración de Supabase Oficial
- ✅ URL: `https://ckimjzfajaihaeqfgtoj.supabase.co`
- ✅ Anon Key configurada
- ✅ Service Role Key configurada
- ✅ Publishable Key configurada

### 3. Dependencias Instaladas
- ✅ `@tanstack/router-devtools` — herramienta de desarrollo para TanStack Router
- ✅ Build completado exitosamente

## 📋 Pasos para Desplegar en Vercel

### Opción 1: Desplegar desde la UI de Vercel

1. **Ir a Vercel Dashboard:**
   - Visita https://vercel.com/dashboard
   - Inicia sesión con tu cuenta

2. **Conectar Repositorio:**
   - Click en "Add New" → "Project"
   - Selecciona el repositorio `aperezavilez-ai/publivende`
   - Click en "Import"

3. **Configurar Variables de Entorno:**
   En la sección "Environment Variables", agrega las siguientes variables:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://ckimjzfajaihaeqfgtoj.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNraW1qemZhamFpaGFlcWZndG9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTQ1MDgsImV4cCI6MjA5Njg3MDUwOH0.T2pHE7RJatdMfqwhBK9Qv9oIpVyzzLps73MX-IjmzhI
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNraW1qemZhamFpaGFlcWZndG9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NDUwOCwiZXhwIjoyMDk2ODcwNTA4fQ.aKN4LeFNB1fRsNEQxmKTP7pU00Zqh7DzUAW0YsaddIo
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_qyiH6MPK9qH3gE27AyQqxA_QcmSPDGH
   JWT_SECRET=publivende-jwt-secret-key-2024-production-change-this
   NEXT_PUBLIC_BASE_URL=https://publivende.vercel.app
   ```

4. **Configuración de Build en Vercel Dashboard:**
   - **Framework Preset:** **Other** (o dejar sin override). *¡IMPORTANTE: NO seleccionar Vite, ya que Vite busca `dist`, mientras que Nitro genera automáticamente `.vercel/output` con SSR!*
   - **Build Command:** `npm run build`
   - **Output Directory:** *(Dejar vacío / desactivar override, Vercel detecta `.vercel/output` automáticamente)*
   - **Install Command:** `npm install`
   - **Node.js Version en Settings:** 22.x (o 20.x)

5. **Desplegar:**
   - Click en "Deploy"
   - Espera a que termine el build (2-3 minutos)

### Opción 2: Desplegar desde la CLI

```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# Autenticarse
vercel login

# Ir al directorio del proyecto
cd "D:\PROGRAMAS IA\PUBLIVENDE"

# Desplegar
vercel

# O desplegar a producción directamente
vercel --prod
```

## 🔧 Configuración Post-Despliegue

### 1. Configurar Dominio
- En Vercel Dashboard → Settings → Domains
- Agregar dominio personalizado: `publivende.mx`
- Configurar DNS con los registros de Vercel

### 2. Actualizar Callbacks de OAuth
Una vez desplegado, actualiza las URLs de callback en:

#### Meta (Facebook/Instagram)
- Facebook Developers Console
- Agregar URL: `https://publivende.vercel.app/oauth/callback`

#### Google (YouTube)
- Google Cloud Console
- Agregar URL: `https://publivende.vercel.app/oauth/google/callback`

#### TikTok
- TikTok Developer Portal
- Agregar URL: `https://publivende.vercel.app/oauth/tiktok/callback`

### 3. Configurar Webhooks

#### Stripe
- Stripe Dashboard → Developers → Webhooks
- Agregar endpoint: `https://publivende.vercel.app/api/webhook/stripe`
- Copiar signing secret y agregarlo a variables de entorno

#### WhatsApp Business
- Meta Developer Console → WhatsApp → Configuration
- Webhook URL: `https://publivende.vercel.app/api/webhook/whatsapp`
- Verify Token: (el que definiste en `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)

## 🧪 Verificación del Despliegue

### 1. Verificar que el sitio carga
```bash
curl https://publivende.vercel.app
```

### 2. Verificar autenticación
```bash
curl https://publivende.vercel.app/api/auth/me
```

### 3. Verificar conexión a Supabase
- Ir a https://publivende.vercel.app/dashboard
- Debe redirigir a login si no hay sesión

## 📊 Monitoreo

### Vercel Analytics
- Ve a tu proyecto en Vercel
- Navega a "Analytics" para ver métricas de tráfico

### Logs
```bash
# Ver logs en tiempo real
vercel logs publivende --follow

# Ver últimos logs
vercel logs publivende
```

### Error Tracking
- Configura Sentry para rastrear errores en producción
- Agrega `SENTRY_DSN` a variables de entorno

## 🚨 Troubleshooting

### Error: "Function Runtimes must have a valid version"
**Solución:** Asegúrate de que `vercel.json` tiene la configuración correcta de funciones.

### Error: "Conflicting configuration paths"
**Solución:** Ya resuelto - eliminamos las rutas duplicadas.

### Error: "Cannot find module '@tanstack/router-devtools'"
**Solución:** Ya resuelto - instalamos la dependencia.

### Error: Build Failed
1. Verifica que todas las variables de entorno estén configuradas
2. Revisa los logs de build en Vercel Dashboard
3. Ejecuta `npm run build` localmente para reproducir el error

## 📝 Notas Importantes

1. **JWT_SECRET:** Cambia el valor por defecto en producción por uno aleatorio y seguro
2. **Base URL:** Actualiza `NEXT_PUBLIC_BASE_URL` con tu dominio final
3. **CORS:** Verifica que las políticas de CORS permitan tu dominio en Supabase
4. **Rate Limiting:** Considera implementar rate limiting para proteger tus APIs

## ✅ Checklist Final

- [ ] Despliegue exitoso en Vercel
- [ ] Variables de entorno configuradas
- [ ] Dominio personalizado configurado (opcional)
- [ ] Callbacks OAuth actualizados
- [ ] Webhooks configurados
- [ ] Sitio accesible y funcional
- [ ] Autenticación funciona correctamente
- [ ] Conexión a Supabase verificada
- [ ] Analytics configurado
- [ ] Monitoreo de errores activado

## 🔗 Links Útiles

- **Dashboard de Vercel:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://ckimjzfajaihaeqfgtoj.supabase.co
- **Repositorio GitHub:** https://github.com/aperezavilez-ai/publivende
- **Documentación Vercel:** https://vercel.com/docs
- **Documentación TanStack Start:** https://tanstack.com/start/latest

---

**Última actualización:** 23 de octubre de 2026
**Build exitoso:** ✅ Sin errores
**Estado:** Listo para producción
