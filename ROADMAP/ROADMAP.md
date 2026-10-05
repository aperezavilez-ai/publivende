# PUBLIVENDE — ROADMAP

Fuente de verdad del proceso del proyecto para el agente. LEER ESTO ANTES de cualquier tool.
PROHIBIDO reexplorar el repo entero si este documento cubre la tarea. Solo read_file de lo que vas a editar.
EditCore actualiza este archivo tras cambios. No pedirlo al usuario. No pegar codigo largo.

## Proceso
- Fase: implementacion
- Estado: En proceso: Algo falló durante la ejecución: No pude autenticar el modelo. Revisa la API key en Modelos e intenta de nuevo.
- Actualizado: 2026-09-29 19:43
- Preview: desconocido — usa el preview del IDE, no inventes puertos

## Mapa
- src/lib/schedule-local.ts
- src/lib/save-draft-post.ts
- src/lib/bootstrap.ts
- src/routes/api.webhook.whatsapp.tsx
- src/routes/api.v1.partners.users.tsx
- src/routes/api.v1.partners.publish.tsx
- package.json — tanstack_start_ts · scripts: dev, build, build:dev, preview, lint, format, db:generate, db:migrate, db:push
- stack: React + Vite + TypeScript
- .cursor/
- .env
- .env.example
- .env.local
- .github/
- .gitignore
- .lovable/
- .prettierignore
- .prettierrc
- .project-governance/
- .tanstack/
- .workspace/
- AGENTS.md
- bun.lock
- bunfig.toml
- CLAUDE.md
- components.json
- docs/
- docs/icon-1024.png
- docs/index.html
- docs/privacidad.html
- docs/PRODUCTION.md
- docs/terminos.html
- drizzle/
- drizzle.config.ts
- eslint.config.js
- package-lock.json
- packages/
- project-infra.json
- public/
- public/data/
- public/demo/
- public/icon-1024.png
- public/icon-192.png
- public/icon-512.png
- public/icon-brand-1024.png
- public/icon-maskable.svg
- public/icon.svg
- public/logo-icon.svg
- public/logo-publivende.png

## Archivos clave (no reexplorar)
- package.json
- src/server/db/schema.ts
- src/server/config.ts
- src/server/partners/auth.ts
- src/server/partners/api-handlers.ts
- src/server/publish/service.ts
- src/server/auth/users.ts
- src/lib/mock/types.ts
- src/server/distribution/expand.ts
- src/server/whatsapp/cloud-api.ts
- src/server/publish/networks.ts
- src/routes/_app.plataforma.tsx
- src/routes/api.v1.partners.publish.tsx
- src/routes/api.v1.partners.users.tsx
- src/routes/api.webhook.whatsapp.tsx
- .editcore/task-state.json

## Tarea activa
- hola

## Bloqueos / bugs conocidos
- falló durante la ejecución: No pude autenticar el modelo. Revisa la API key en Modelos e intenta de nuevo.
- Actualizado: 2026-09-19 18:24
- Preview: desconocido — usa el preview del IDE, no inventes puertos

## Decisiones
- Ninguna registrada

## Cambios recientes
- package.json
- src/server/db/schema.ts
- src/server/config.ts
- src/server/partners/auth.ts
- src/server/partners/api-handlers.ts
- src/server/publish/service.ts
- src/server/auth/users.ts
- src/lib/mock/types.ts
- src/server/distribution/expand.ts
- src/server/whatsapp/cloud-api.ts
- src/server/publish/networks.ts
- src/routes/_app.plataforma.tsx
- src/routes/api.v1.partners.publish.tsx
- src/routes/api.v1.partners.users.tsx
- src/routes/api.webhook.whatsapp.tsx
- .editcore/task-state.json
- src/lib/bootstrap.ts
- src/lib/save-draft-post.ts

## Verificado
- Pendiente

## Siguiente
- Continuar desde el estado actual.

## Regla anti-reexploracion
- Si el pedido del usuario apunta a un archivo ya listado arriba: ve DIRECTO a read_file/replace_in_file de ese path.
- PROHIBIDO list_files('.') / project_discovery / codebase_map del repo completo en el mismo turno si el Mapa ya tiene >= 5 entradas utiles.
- Tras mutar: EditCore refresca este ROADMAP; continua desde aqui en el siguiente mensaje.
