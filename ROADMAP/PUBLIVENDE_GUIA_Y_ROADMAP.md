# PubliVende: visión, guía y roadmap

Actualizado: 5 de octubre de 2026 · Sitio: https://www.publivende.mx

---

## 1. Qué es PubliVende

**PubliVende es una plataforma de distribución de contenido con IA.** Personas y negocios dan de alta sus cuentas (personales o de negocio) y PubliVende, con inteligencia artificial, decide **dónde, cuándo y cómo** publicar su contenido para que llegue a la mayor cantidad de gente posible en **Facebook, Instagram, TikTok y YouTube**, y lo convierte en clientes por WhatsApp.

Mucha gente usa bots (cuentas falsas, likes comprados, spam en grupos) para "crecer". **PubliVende usa IA y solo métodos permitidos por las redes**: los bots hacen que las redes bloqueen las cuentas, y la IA hace crecer contenido real con audiencia real.

**Meta:** ser la plataforma número uno de distribución de contenido en LATAM, con resultados medibles y sin trampas.

## 2. Cómo distribuye PubliVende (el motor)

La IA trabaja en cuatro capas. Las cuatro respetan las reglas de cada red.

### Capa 1: Radar de nichos (la IA identifica dónde está la audiencia)

La IA analiza cada nicho (comida, ropa, belleza, fitness, inmobiliaria, servicios, etc.) para saber:

- qué nichos y temas tienen más audiencia y están creciendo;
- qué cuentas, hashtags y formatos (reel, video corto, carrusel) dominan cada nicho;
- a qué hora y qué días responde mejor la audiencia;
- qué tipo de gancho y texto funciona.

Fuentes reales y permitidas:

| Fuente | Qué da | Condición |
|---|---|---|
| YouTube Data API | Videos más vistos por tema y región, tendencias | Gratis con cuota diaria |
| Instagram Graph API: búsqueda de hashtags | Publicaciones top y recientes de un hashtag | Máx. 30 hashtags distintos por semana por cuenta; requiere aprobación de Meta |
| Instagram Business Discovery | Seguidores y publicaciones de otras cuentas de negocio | Requiere aprobación de Meta |
| Biblioteca de anuncios de Meta | Qué anuncian los competidores del nicho | API pública |
| **Resultados de todos los usuarios de PubliVende** | Qué funciona de verdad por nicho, ciudad, hora y formato | Propio. Es la ventaja más fuerte: cada usuario nuevo hace más lista a la IA |

TikTok no da una API pública de tendencias (su API de investigación es solo para universidades), así que para TikTok la IA aprende de los resultados de las cuentas conectadas.

### Capa 2: Canales del usuario (sus propias redes)

El usuario conecta su Facebook, Instagram, TikTok y YouTube. La IA:

- elige en qué red y formato va cada contenido;
- adapta el texto, los hashtags y el gancho por red;
- programa a la mejor hora del nicho;
- mide el resultado y ajusta la siguiente publicación.

### Capa 3: Red oficial PubliVende por nicho (posicionar PubliVende donde está la audiencia)

PubliVende opera **sus propias cuentas por nicho** en las cuatro redes (ejemplo: "PubliVende Comida MX", "PubliVende Moda MX"). La IA:

1. elige los nichos con más audiencia (con el radar de la Capa 1);
2. hace crecer esas cuentas con contenido de valor del nicho (tendencias, recomendaciones, ofertas);
3. **presenta en ellas el contenido y los productos de los usuarios** que pidieron el impulso, con enlace a su perfil, su tienda o su WhatsApp;
4. en Instagram usa **publicaciones en colaboración**: la misma publicación aparece en la cuenta de PubliVende y en la del usuario, y suma la audiencia de las dos.

Así funciona una red de medios: PubliVende junta audiencia por nicho y la reparte entre sus usuarios. Es la forma permitida de "difundir desde PubliVende a los usuarios".

### Capa 4: Impulso pagado (opcional)

Cuando un contenido funciona solo, la IA propone promocionarlo con anuncios de Meta (ya existe código: `src/server/ads/meta-boost.ts`) eligiendo la audiencia por nicho y ciudad. Es el alcance más rápido y medible; lo paga el usuario.

## 3. Lo que PubliVende NO hace (y por qué)

Nada de esto se va a construir. Cualquiera de estas cosas hace que Meta, TikTok o Google bloqueen la app completa, y todos los usuarios pierden sus conexiones.

- Bots, cuentas falsas, seguidores o likes comprados.
- Comentarios o mensajes automáticos masivos (spam).
- Publicar en grupos de Facebook por API: Meta eliminó esa función en 2024.
- Publicar en páginas o cuentas de otras personas sin su permiso.
- Prometer números: nadie puede garantizar "X seguidores". PubliVende muestra resultados reales medidos.

## 4. Cómo funciona por dentro

- PubliVende tiene **una app registrada en Meta** (App ID `1514804460108550`), una en Google (YouTube) y una en TikTok.
- Cada usuario conecta **sus** cuentas en **Configuración → Conecta tus redes**. PubliVende guarda un permiso cifrado (token), nunca contraseñas.
- Las cuentas oficiales de la red PubliVende (Capa 3) las conecta y las maneja **el administrador**.

### Tú como administrador

Tu cuenta (`aperezavilez@gmail.com`) es administradora:

1. **Sin límites.** Siempre tienes el plan más alto, y la pantalla dice "Administrador · sin límites".
2. **Puedes conectar las cuentas oficiales de PubliVende** (a los clientes se les bloquea elegirlas).
3. **Herramientas avanzadas** en el menú (hoy son pantallas de muestra; ver sección 6).
4. **Plataforma (marca blanca)**: dar de alta otros proyectos con su API key.

## 5. Cómo se usa (flujo de un usuario)

1. **Registro** en publivende.mx: cuenta personal o de negocio, y plan.
2. **Onboarding**: nombre, giro (nicho), ciudad y público.
3. **Conectar redes**: Facebook, Instagram, TikTok, YouTube y WhatsApp.
4. **Diagnóstico IA**: la IA revisa sus cuentas y le dice qué cambiar.
5. **Subir contenido** (foto, video, link de producto o una idea). La IA prepara la versión de cada red.
6. **La IA distribuye**: publica en sus redes a la mejor hora (Capa 2). Si el usuario lo activa, lo propone para la red oficial PubliVende de su nicho (Capa 3).
7. **Resultados**: alcance, vistas y clientes que llegaron por WhatsApp, por publicación y por red.

## 6. Qué existe hoy (estado real, sin adornos)

Estados: **Funciona** = usa datos reales · **Parcial** = funciona, pero falta algo · **Demo** = pantalla de muestra · **Falso** = datos inventados, hay que quitarlo.

| Pieza | Qué hace | Estado |
|---|---|---|
| Perfiles de nicho (`src/lib/brain/niches.ts`) | 9 nichos con ganchos, llamados a la acción y temporadas | Funciona, pero escritos a mano: todavía no aprenden de datos reales |
| Diagnóstico IA | Analiza el negocio y da plan semanal | Parcial: falta la llave de MeAI |
| Piloto automático | La IA escribe y programa la semana | Parcial: falta la llave de MeAI |
| Publicar en redes del usuario (Capa 2) | Publica en Facebook, Instagram, TikTok y YouTube | Parcial: faltan permisos de Meta (sección 8) y auditorías de TikTok y Google |
| Enlace rastreable + WhatsApp | Cada publicación lleva link `/p/<slug>` y registra de dónde vino el cliente | Funciona |
| Analíticas | Métricas por red | Parcial: falta el permiso `read_insights` |
| Impulso pagado (`meta-boost.ts`) | Promocionar con anuncios de Meta | Parcial: requiere permisos de anuncios |
| Directorio de comunidades (`src/lib/distribution/community-catalog.ts`) | Muestra 29 "grupos" con miles de miembros | **Falso**: nombres y cifras escritos a mano, no son grupos verificados. Se debe quitar |
| Publicar en grupos de Facebook (`src/server/distribution/facebook-groups.ts`) | Publicar en grupos | **No funciona**: Meta eliminó la API en 2024. Se debe quitar |
| Radar de nichos con datos reales (Capa 1) | | No existe |
| Red oficial PubliVende por nicho (Capa 3) | | No existe |
| Aprendizaje con resultados de todos los usuarios | | No existe |
| Bandeja, Anuncios, A/B, Coach, Inteligencia, Recetas (admin) | Herramientas avanzadas | **Demo** |

## 7. Planes

| | Free | Pro ($399/mes) | Business ($999/mes) | Administrador |
|---|---|---|---|---|
| Redes por publicación | 1 | 4 | 4 | 4 |
| Publicaciones al mes | 10 | ilimitadas | ilimitadas | ilimitadas |
| Conversaciones WhatsApp | 50 | 500 | ilimitadas | ilimitadas |
| Productos | 5 | 50 | 999 | 999 |
| Piloto automático | 3/semana, con aprobación | 7/semana | 14/semana | 14/semana |
| Impulso en la red PubliVende (propuesto) | no | 2/mes | 8/mes | sin límite |

## 8. Por qué hoy no se puede publicar en Facebook (y cómo se arregla)

Revisé la conexión real con Meta:

- La página conectada es **Publivende** (43 seguidores). El permiso está vigente y no vence.
- Meta solo le dio permisos de lectura y de WhatsApp. **Falta `pages_manage_posts`**, que es el permiso para publicar.
- La página **no tiene Instagram profesional vinculado**.

**Lo que tienes que hacer tú en Meta:**

1. Entra a https://developers.facebook.com/apps/1514804460108550
2. **Casos de uso → "Administrar todo en tu página" → Personalizar → Permisos**: agrega `pages_manage_posts`, `pages_read_engagement`, `pages_show_list` y `read_insights`.
3. **Casos de uso → Instagram API**: agrega `instagram_basic`, `instagram_content_publish` e `instagram_manage_insights`. Vincula el Instagram profesional a la página Publivende.
4. En PubliVende: **Configuración → Facebook → Desconectar → Conectar**, aceptando todos los permisos.

Mientras la app esté en modo desarrollo, solo funciona para ti y los "Testers". Para usuarios públicos, Meta exige **Verificación del negocio** y **Revisión de la app**. TikTok exige su auditoría (sin ella los videos salen privados) y YouTube la verificación de Google.

## 9. Lo que se corrigió el 5 de octubre de 2026

1. **Administrador sin límites** (antes aparecía como Free).
2. **Conectar Facebook fallaba**: la app pedía `publish_to_groups`, que Meta eliminó. Se quitó.
3. **La página Publivende estaba bloqueada para todos**, incluido tú. Ahora solo para clientes.
4. **Nombre fijo "Luis Avilez"** en la sugerencia de página. Ahora usa el nombre de cada negocio.
5. **IA con MeAI** y llave propia (falta poner la llave).
6. **Login** contra la base de datos propia de PubliVende.

## 10. Roadmap

### Fase 0: Desbloquear y limpiar (esta semana)

- [x] Administrador sin límites, scopes de Meta corregidos, página oficial habilitada
- [ ] **Tú:** permisos en Meta, vincular Instagram y reconectar Facebook (sección 8)
- [ ] **Tú:** llave de MeAI en `PUBLIVENDE\.env.local` (`MEAI_API_KEY=`)
- [ ] Yo: quitar el directorio de comunidades inventado y la publicación en grupos de Facebook
- [ ] Yo: esconder del menú las 6 pantallas demo hasta que sean reales
- [ ] Yo: publicar y probar una publicación real en la página Publivende

### Fase 1: Red oficial PubliVende (Capa 3)

- [ ] **Tú:** crear las cuentas oficiales por nicho (empezar con 2 o 3 nichos) en Facebook, Instagram, TikTok y YouTube
- [ ] Panel de administrador "Red PubliVende": conectar varias cuentas oficiales, una por nicho y red
- [ ] Botón para el usuario "Impulsar en la red PubliVende" con su aceptación de términos
- [ ] Cola de impulsos: la IA revisa calidad, elige la cuenta del nicho y la hora, y tú apruebas (después, automático)
- [ ] Publicaciones en colaboración en Instagram (cuenta PubliVende + cuenta del usuario)
- [ ] Contenido propio diario de la IA en cada cuenta oficial para hacerlas crecer

### Fase 2: Radar de nichos con datos reales (Capa 1)

- [ ] Recolectar tendencias de YouTube Data API por nicho y región
- [ ] Hashtags e Instagram Business Discovery (tras aprobación de Meta)
- [ ] Guardar los resultados de cada publicación (alcance, interacción, clics, WhatsApp) por nicho, hora y formato
- [ ] Que la IA use esos datos para decidir red, formato, hora y hashtags (reemplaza los perfiles escritos a mano)
- [ ] Ranking de nichos por audiencia y crecimiento, visible para el administrador

### Fase 3: Abrir a usuarios públicos

- [ ] Verificación del negocio y Revisión de la app en Meta
- [ ] Auditoría de TikTok y verificación de Google (YouTube)
- [ ] WhatsApp por cliente (falta `WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID`)
- [ ] Cobros automáticos (falta `STRIPE_WEBHOOK_SECRET`)
- [ ] Prueba completa con usuarios reales

### Fase 4: Escalar

- [ ] Impulso pagado guiado por la IA (Capa 4)
- [ ] Más nichos y países según el radar
- [ ] Reporte público de resultados reales (alcance total distribuido, clientes generados)
- [ ] Marca blanca para otros proyectos (API y SDK `packages/publivende-sdk`)

## 11. Datos técnicos (referencia)

| Concepto | Valor |
|---|---|
| Sitio | https://www.publivende.mx (Vercel, proyecto `publivende`) |
| Base de datos | Supabase propio: `https://publivende.gafcore.com` (instancia `publivende`, puertos 57321/57322) |
| Login | Propio de PubliVende (tabla `users`, contraseña cifrada), no usa Supabase Auth |
| IA | MeAI, `MEAI_API_KEY`, modelo configurable con `MEAI_MODEL` |
| Meta App ID | `1514804460108550` |
| Redirect de Facebook | `https://www.publivende.mx/facebook/callback` |
| Administrador | `is_admin = true` en la tabla `users` (solo por script, nunca desde la app) |
