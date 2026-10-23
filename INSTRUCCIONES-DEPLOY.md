# 🚀 Instrucciones de Deploy - Publivende

## Paso 1: Preparar Base de Datos (Neon)

### 1.1 Crear cuenta en Neon
1. Ve a https://neon.tech
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto llamado "publivende"

### 1.2 Obtener Connection String
1. En el dashboard de Neon, copia la **Connection String**
2. Se verá algo así:
   ```
   postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb
   ```
3. Guárdala para el siguiente paso

---

## Paso 2: Deploy a Vercel

### 2.1 Opción A: Deploy desde GitHub (RECOMENDADO)

1. **Ve a https://vercel.com**
2. **Haz login** (puedes usar tu cuenta de GitHub)
3. **Click en "Add New Project"**
4. **Importa tu repositorio:**
   - Selecciona "aperezavilez-ai/publivende"
   - Click en "Import"

5. **Configurar el proyecto:**
   - **Framework Preset:** Vite
   - **Root Directory:** ./
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

6. **Agregar Variables de Entorno:**
   
   Click en "Environment Variables" y agrega:

   ```env
   # Base de Datos (de Neon)
   DATABASE_URL=tu-connection-string-de-neon
   
   # Auth (genera uno random)
   JWT_SECRET=tu-secret-super-seguro-cambiar-esto
   
   # AI (opcional por ahora, obtener en console.anthropic.com)
   ANTHROPIC_API_KEY=sk-ant-api-key
   
   # App
   NODE_ENV=production
   FRONTEND_URL=https://tu-app.vercel.app
   ```

7. **Click en "Deploy"**

8. **Espera 2-3 minutos** mientras Vercel construye tu app

9. **¡Listo!** Tu app estará en: `https://publivende-xxx.vercel.app`

---

### 2.2 Opción B: Deploy desde CLI

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
cd /d/PROGRAMAS\ IA/PUBLIVENDE
vercel

# 4. Sigue las instrucciones:
# - Set up and deploy? Yes
# - Which scope? (tu cuenta)
# - Link to existing project? No
# - Project name: publivende
# - Directory: ./
# - Want to override settings? No

# 5. Configurar variables de entorno
vercel env add DATABASE_URL
# Pega tu connection string de Neon

vercel env add JWT_SECRET
# Pega un secret seguro

# 6. Deploy a producción
vercel --prod
```

---

## Paso 3: Ejecutar Migraciones de Base de Datos

### 3.1 Desde tu máquina local

```bash
# 1. Configurar DATABASE_URL temporalmente
export DATABASE_URL="tu-connection-string-de-neon"

# 2. Ejecutar migraciones
npm run db:migrate

# O alternativamente
npm run db:push
```

### 3.2 Verificar la base de datos

```bash
# Abrir Drizzle Studio
npm run db:studio

# O conectarte directamente a Neon
psql "tu-connection-string-de-neon"
```

---

## Paso 4: Configurar APIs de Redes Sociales (Opcional)

### 4.1 Anthropic Claude AI (para Autopilot)

1. Ve a https://console.anthropic.com
2. Crea una cuenta
3. Genera un API key
4. En Vercel Dashboard → Settings → Environment Variables:
   - Add: `ANTHROPIC_API_KEY` = `sk-ant-...`

### 4.2 Facebook & Instagram

1. Ve a https://developers.facebook.com
2. Crea una app
3. Activa Facebook Login e Instagram Basic Display
4. Agrega a Vercel:
   - `FACEBOOK_APP_ID`
   - `FACEBOOK_APP_SECRET`
   - `INSTAGRAM_APP_ID`
   - `INSTAGRAM_APP_SECRET`

### 4.3 Otras Redes (cuando las necesites)

- **Twitter:** https://developer.twitter.com
- **LinkedIn:** https://www.linkedin.com/developers
- **TikTok:** https://developers.tiktok.com
- **WhatsApp:** https://business.facebook.com

---

## Paso 5: Configurar Dominio Custom (Opcional)

### 5.1 En Vercel

1. Ve a tu proyecto en Vercel
2. Settings → Domains
3. Add Domain: `tudominio.com`
4. Sigue las instrucciones para configurar DNS

### 5.2 Configurar DNS

En tu proveedor de dominio (GoDaddy, Namecheap, etc.):

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com

Type: A
Name: @
Value: 76.76.21.21
```

---

## Paso 6: Verificar el Deploy

### 6.1 Health Check

```bash
curl https://tu-app.vercel.app/api/health
```

Debería responder:
```json
{
  "status": "ok",
  "timestamp": "2024-01-16T...",
  "service": "Publivende API"
}
```

### 6.2 Verificar Frontend

1. Abre `https://tu-app.vercel.app`
2. Verifica que carga correctamente
3. Prueba la navegación entre páginas

### 6.3 Verificar Database

```bash
# Desde tu máquina local
npm run db:studio

# Verifica que las tablas existen
```

---

## Paso 7: Monitoreo Post-Deploy

### 7.1 Ver Logs en Vercel

1. Ve a tu proyecto en Vercel
2. Click en "Deployments"
3. Click en el deployment más reciente
4. Ve la tab "Logs"

### 7.2 Ver Analytics

1. En Vercel: Analytics tab
2. Verás:
   - Requests
   - Response times
   - Errores

---

## 🎉 ¡Deploy Completado!

Tu aplicación Publivende está ahora en producción.

### URLs Importantes:

- **App:** https://tu-app.vercel.app
- **API Health:** https://tu-app.vercel.app/api/health
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Neon Dashboard:** https://console.neon.tech

### Próximos Pasos:

1. ✅ Registrar tu primera cuenta
2. ✅ Conectar tus redes sociales
3. ✅ Generar tu primer post con Autopilot
4. ✅ Configurar dominio custom
5. ✅ Invitar a tu equipo

---

## 🆘 Troubleshooting

### Error: "Cannot connect to database"

```bash
# Verifica que DATABASE_URL esté configurado en Vercel
vercel env ls

# Prueba la conexión desde local
psql "tu-connection-string-de-neon"
```

### Error: "Build failed"

```bash
# Verifica que el build funciona localmente
npm run build

# Si hay errores, corrígelos y haz commit
git add .
git commit -m "fix: build errors"
git push

# Vercel re-deployará automáticamente
```

### Error: "API routes not working"

- Verifica que `vercel.json` existe
- Verifica que las rewrites estén configuradas
- Revisa los logs en Vercel Dashboard

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs en Vercel
2. Verifica las variables de entorno
3. Consulta la documentación de Vercel
4. Abre un issue en GitHub

---

**¡Tu app está lista para el mundo! 🚀**
