# 🚀 Publivende - Plataforma de Marketing Automation con IA

![Publivende](https://img.shields.io/badge/Publivende-v1.0.0-blue)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

Plataforma todo-en-uno para gestionar redes sociales, generar contenido con IA, y automatizar tu marketing digital.

## ✨ Características Principales

### 🤖 Autopilot con Claude AI
- Generación automática de contenido optimizado
- Análisis de tendencias y mejor horario de publicación
- Sugerencias de imágenes y hashtags
- Adaptación automática del tono de marca

### 📊 Analytics Avanzado
- Métricas en tiempo real de todas tus redes sociales
- Comparación de rendimiento entre plataformas
- Insights de audiencia (demografía, ubicación)
- Reportes de engagement y alcance

### 📅 Calendario de Contenido
- Vista mensual de publicaciones programadas
- Drag & drop para reorganizar posts
- Previsualización multi-red
- Programación inteligente basada en mejores horarios

### 🎯 Gestión de Campañas
- Organiza contenido por campañas
- Seguimiento de objetivos y KPIs
- ROI y métricas de conversión
- Templates de campañas exitosas

### 🛍️ Catálogo de Productos
- Importación automática desde tu e-commerce
- Generación de posts por producto
- Sincronización con inventario
- Estadísticas de productos más populares

### 💬 WhatsApp Business
- Gestión centralizada de conversaciones
- Respuestas rápidas y plantillas
- Automatización con chatbots
- Métricas de tiempo de respuesta

### 🎨 Recetas de Contenido
- Templates pre-diseñados para diferentes industrias
- Personalización según tu marca
- A/B testing de formatos
- Biblioteca de contenido exitoso

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** + **TypeScript 5**
- **TanStack Router** - Routing type-safe
- **TanStack Query** - Data fetching y caché
- **Tailwind CSS** - Styling utility-first
- **Shadcn/ui** - Componentes UI accesibles
- **Recharts** - Visualización de datos
- **Vite** - Build tool ultra-rápido

### Backend
- **Hono** - Framework web ultrarrápido
- **Drizzle ORM** - Type-safe database access
- **PostgreSQL** - Base de datos principal
- **Node.js** - Runtime

### IA & Integrations
- **Anthropic Claude 3.5** - Generación de contenido
- **Meta Graph API** - Facebook & Instagram
- **Twitter API v2** - X (Twitter)
- **LinkedIn Marketing API**
- **TikTok Business API**
- **WhatsApp Business API**

## 🚀 Instalación

### Prerequisitos
- Node.js 20+ 
- PostgreSQL 15+
- npm o pnpm

### Paso 1: Clonar el repositorio
\`\`\`bash
git clone https://github.com/tu-usuario/publivende.git
cd publivende
\`\`\`

### Paso 2: Instalar dependencias
\`\`\`bash
npm install
\`\`\`

### Paso 3: Configurar variables de entorno
\`\`\`bash
cp .env.example .env
# Edita .env con tus credenciales
\`\`\`

### Paso 4: Configurar base de datos
\`\`\`bash
# Genera el schema
npm run db:generate

# Ejecuta las migraciones
npm run db:migrate

# (Opcional) Seed con datos de ejemplo
npm run db:seed
\`\`\`

### Paso 5: Iniciar desarrollo
\`\`\`bash
# Iniciar frontend y backend en paralelo
npm run dev
\`\`\`

La aplicación estará disponible en:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 📁 Estructura del Proyecto

\`\`\`
publivende/
├── src/
│   ├── components/        # Componentes React
│   │   ├── analytics/    # Dashboard analytics
│   │   ├── autopilot/    # Sistema Autopilot
│   │   ├── calendar/     # Calendario contenido
│   │   ├── campaigns/    # Gestión campañas
│   │   ├── dashboard/    # Dashboard principal
│   │   ├── layout/       # Layouts y navegación
│   │   ├── posts/        # Composer y gestión posts
│   │   ├── products/     # Catálogo productos
│   │   ├── ui/          # Componentes UI base
│   │   └── whatsapp/    # WhatsApp Business
│   ├── db/              # Database schema y conexión
│   │   ├── schema.ts    # Esquemas Drizzle
│   │   └── index.ts     # DB connection
│   ├── lib/             # Utilidades y helpers
│   │   ├── ai/         # Funciones IA
│   │   ├── auth.ts     # Autenticación
│   │   └── utils.ts    # Helpers generales
│   ├── routes/         # Rutas TanStack Router
│   ├── server/         # Backend Hono
│   │   ├── api/       # API endpoints
│   │   └── index.ts   # Server setup
│   └── main.tsx       # Entry point
├── drizzle/            # Migraciones DB
├── public/             # Assets estáticos
└── package.json
\`\`\`

## 🔑 Configuración de APIs

### Anthropic Claude AI
1. Regístrate en https://console.anthropic.com
2. Crea un API key
3. Agrega a `.env`: `ANTHROPIC_API_KEY=tu-key`

### Facebook & Instagram
1. Ve a https://developers.facebook.com
2. Crea una aplicación
3. Configura Facebook Login e Instagram Basic Display
4. Agrega credenciales a `.env`

### Twitter/X API
1. Aplica en https://developer.twitter.com
2. Obtén API keys
3. Configura en `.env`

### LinkedIn
1. Crea app en https://www.linkedin.com/developers
2. Solicita acceso a Marketing API
3. Configura credenciales

## 📊 Scripts Disponibles

\`\`\`bash
# Desarrollo
npm run dev              # Inicia dev server (frontend + backend)
npm run dev:frontend     # Solo frontend
npm run dev:backend      # Solo backend

# Build
npm run build           # Build para producción
npm run preview         # Preview del build

# Database
npm run db:generate     # Genera migraciones
npm run db:migrate      # Ejecuta migraciones
npm run db:push         # Push cambios sin migración
npm run db:studio       # Abre Drizzle Studio
npm run db:seed         # Seed datos de ejemplo

# Calidad de código
npm run lint            # Ejecuta ESLint
npm run format          # Formatea con Prettier
npm run typecheck       # Verifica tipos TypeScript

# Testing
npm run test            # Ejecuta tests
npm run test:watch      # Tests en modo watch
\`\`\`

## 🌍 Deployment

### Opción 1: Railway
\`\`\`bash
npm install -g @railway/cli
railway login
railway init
railway up
\`\`\`

### Opción 2: Vercel + Neon
1. Deploy frontend en Vercel
2. Crea DB PostgreSQL en Neon.tech
3. Configura variables de entorno
4. Deploy automático desde GitHub

### Opción 3: Docker
\`\`\`bash
docker build -t publivende .
docker run -p 3000:3000 publivende
\`\`\`

## 🎯 Roadmap

- [x] Dashboard principal con métricas
- [x] Sistema Autopilot con Claude AI
- [x] Calendario de contenido
- [x] Analytics multi-red
- [x] Gestión de productos
- [x] Campañas de marketing
- [x] WhatsApp Business integration
- [ ] Mobile app (React Native)
- [ ] Plugin WordPress
- [ ] Integración con Shopify/WooCommerce
- [ ] Video editing con IA
- [ ] A/B testing automático
- [ ] Competitor analysis
- [ ] Influencer marketplace

## 🤝 Contribuir

Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

## 💬 Soporte

- 📧 Email: support@publivende.com
- 💬 Discord: [Únete a nuestra comunidad](https://discord.gg/publivende)
- 📖 Docs: https://docs.publivende.com
- 🐛 Issues: https://github.com/tu-usuario/publivende/issues

## 🙏 Agradecimientos

- [Anthropic](https://anthropic.com) por Claude AI
- [Shadcn/ui](https://ui.shadcn.com) por los componentes
- [TanStack](https://tanstack.com) por las increíbles herramientas
- [Hono](https://hono.dev) por el framework web

---

Hecho con ❤️ por el equipo de Publivende
