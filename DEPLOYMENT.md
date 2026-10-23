# 🚀 Guía de Deployment - Publivende

## Pre-requisitos de Deployment

✅ **Completado:**
- ✅ Arquitectura de base de datos (PostgreSQL + Drizzle ORM)
- ✅ Sistema de autenticación con JWT
- ✅ Integración con Claude AI (Anthropic)
- ✅ Dashboard principal con métricas
- ✅ Sistema Autopilot de generación de contenido
- ✅ Analytics con visualizaciones
- ✅ Calendario de contenido
- ✅ Gestión de campañas
- ✅ Catálogo de productos
- ✅ WhatsApp Business integration
- ✅ APIs REST completas
- ✅ UI responsive con Tailwind CSS

## Opciones de Deployment

### 🎯 Opción 1: Vercel (Frontend) + Neon (Database) - RECOMENDADO

**Ventajas:**
- Deploy automático desde GitHub
- Serverless backend
- PostgreSQL gratis con Neon
- SSL automático
- CDN global

**Pasos:**

1. **Crear base de datos en Neon**
   ```bash
   # Ve a https://neon.tech
   # Crea un nuevo proyecto
   # Copia la connection string
   ```

2. **Deploy en Vercel**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

3. **Configurar variables de entorno en Vercel**
   ```bash
   # Dashboard de Vercel > Settings > Environment Variables
   DATABASE_URL=postgresql://...
   ANTHROPIC_API_KEY=sk-...
   JWT_SECRET=tu-secret-seguro
   ```

4. **Ejecutar migraciones**
   ```bash
   npm run db:migrate
   ```

**Costo estimado:** $0 - $20/mes

---

### 🐳 Opción 2: Railway

**Ventajas:**
- PostgreSQL incluido
- Deploy desde GitHub
- Fácil configuración
- $5 gratis al mes

**Pasos:**

1. **Conectar Railway con GitHub**
   ```bash
   # Ve a https://railway.app
   # Conecta tu repositorio
   ```

2. **Crear servicio PostgreSQL**
   - En Railway dashboard, agrega PostgreSQL
   - Copia las variables de conexión

3. **Configurar variables de entorno**
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ANTHROPIC_API_KEY=sk-...
   JWT_SECRET=tu-secret
   ```

4. **Deploy automático**
   - Railway detectará tu app automáticamente
   - Build y deploy ocurren en cada push

**Costo estimado:** $5-$20/mes

---

### 🌊 Opción 3: DigitalOcean App Platform

**Ventajas:**
- Control total
- PostgreSQL managed
- Precio predecible
- Buen performance

**Pasos:**

1. **Crear cuenta en DigitalOcean**

2. **Crear App desde GitHub**
   ```
   - Selecciona tu repositorio
   - Detecta Vite automáticamente
   - Configura build command: npm run build
   ```

3. **Agregar PostgreSQL Database**
   ```
   - Dev Database: $7/mo
   - Copia connection string
   ```

4. **Configurar variables de entorno**

**Costo estimado:** $12-$25/mes

---

### 🐳 Opción 4: Docker + VPS (Máximo Control)

**Ventajas:**
- Control completo
- Mejor precio a escala
- Portabilidad

**Dockerfile incluido:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

**Deploy:**
```bash
# Build imagen
docker build -t publivende .

# Run con variables de entorno
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e ANTHROPIC_API_KEY=sk-... \
  publivende
```

**Costo estimado:** $5-$15/mes (VPS)

---

## 🔐 Configuración de APIs de Redes Sociales

### Facebook & Instagram
1. Ve a https://developers.facebook.com
2. Crea una app
3. Activa Facebook Login e Instagram Basic Display
4. Obtén:
   - `FACEBOOK_APP_ID`
   - `FACEBOOK_APP_SECRET`
5. Configura OAuth Redirect: `https://tudominio.com/api/auth/facebook/callback`

### Twitter/X
1. Aplica en https://developer.twitter.com
2. Crea un proyecto
3. Obtén:
   - `TWITTER_API_KEY`
   - `TWITTER_API_SECRET`
   - `TWITTER_BEARER_TOKEN`

### LinkedIn
1. Crea app en https://www.linkedin.com/developers
2. Solicita acceso a Marketing API
3. Obtén:
   - `LINKEDIN_CLIENT_ID`
   - `LINKEDIN_CLIENT_SECRET`

### TikTok
1. Registra en https://developers.tiktok.com
2. Crea una app
3. Obtén:
   - `TIKTOK_CLIENT_KEY`
   - `TIKTOK_CLIENT_SECRET`

### WhatsApp Business
1. Ve a https://business.facebook.com
2. Crea cuenta Business
3. Configura WhatsApp API
4. Obtén:
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`
   - `WHATSAPP_ACCESS_TOKEN`

---

## 📊 Monitoreo Post-Deployment

### Health Checks
```bash
# Endpoint health
curl https://tudominio.com/api/health

# Database connection
curl https://tudominio.com/api/health/db
```

### Logs
```bash
# Vercel
vercel logs

# Railway
railway logs

# Docker
docker logs publivende -f
```

### Métricas Clave
- ✅ Response time < 500ms
- ✅ Uptime > 99.9%
- ✅ Error rate < 1%
- ✅ Database connections < 80%

---

## 🔄 CI/CD Pipeline

**GitHub Actions incluido** (`.github/workflows/deploy.yml`):

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 🎯 Next Steps Post-Deploy

1. **Configurar dominio custom**
   - Comprar dominio (ejemplo: publivende.com)
   - Apuntar DNS a tu plataforma
   - Configurar SSL

2. **Setup monitoring**
   - Agregar Sentry para error tracking
   - Configurar Uptime Robot
   - Setup Google Analytics

3. **Backup automático**
   - Backups diarios de PostgreSQL
   - Backup de configuración
   - Disaster recovery plan

4. **Optimizaciones**
   - CDN para imágenes (Cloudinary)
   - Redis cache (opcional)
   - Load balancing si creces

---

## 💡 Tips de Producción

- ✅ Nunca commitees `.env` (ya está en `.gitignore`)
- ✅ Usa variables de entorno para todos los secretos
- ✅ Activa HTTPS/SSL siempre
- ✅ Implementa rate limiting en APIs
- ✅ Monitorea logs regularmente
- ✅ Haz backups antes de cambios grandes
- ✅ Usa migraciones para cambios de DB

---

## 🆘 Troubleshooting

### Error: Cannot connect to database
```bash
# Verifica connection string
echo $DATABASE_URL

# Prueba conexión manual
psql $DATABASE_URL
```

### Error: ANTHROPIC_API_KEY not found
```bash
# Verifica que la key esté configurada
echo $ANTHROPIC_API_KEY

# Regenera la key en console.anthropic.com si es necesario
```

### Build fails
```bash
# Limpia node_modules y reinstala
rm -rf node_modules package-lock.json
npm install

# Limpia cache de build
rm -rf dist .vite
npm run build
```

---

## 📞 Soporte

Si tienes problemas con el deployment:
1. Revisa logs de la plataforma
2. Verifica todas las variables de entorno
3. Consulta la documentación de tu plataforma
4. Abre un issue en GitHub

**¡Tu app está lista para producción! 🚀**
