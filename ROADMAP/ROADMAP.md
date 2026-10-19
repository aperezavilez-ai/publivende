# PUBLIVENDE — ROADMAP

Fuente de verdad del proceso del proyecto para el agente. LEER ESTO ANTES de cualquier tool.
PROHIBIDO reexplorar el repo entero si este documento cubre la tarea. Solo read_file de lo que vas a editar.
EditCore actualiza este archivo tras cambios. No pedirlo al usuario. No pegar codigo largo.

## Proceso
- Fase: implementacion
- Estado: Ciclo finalizado.
- Actualizado: 2026-10-07 21:28
- Preview: desconocido — usa el preview del IDE, no inventes puertos

## Mapa
- src/lib/api/red.functions.ts
- src/lib/api/distribution.functions.ts
- src/lib/api/calendar.functions.ts
- src/lib/api/autopilot.functions.ts
- src/server/partners/admin.ts
- src/lib/api/metrics.functions.ts
- src/lib/api/meta-health.functions.ts
- src/components/oauth/OAuthCallbackView.tsx
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

## Archivos clave (no reexplorar)
- src/lib/api/autopilot.functions.ts
- src/lib/api/calendar.functions.ts
- src/lib/api/distribution.functions.ts
- src/lib/api/red.functions.ts
- src/routes/_app.red.tsx
- src/routes/_app.plataforma.tsx
- src/server/autopilot/generate.ts
- src/server/brain/benchmarks.ts
- src/server/brain/server-diagnosis.ts
- src/server/context.ts
- src/server/metrics/sync.ts
- src/server/partners/admin.ts
- src/server/sync/user-data.ts
- src/server/whatsapp/inbound.ts
- package.json
- src/routes/_app.tsx

## Tarea activa
- SOLICITUD ORIGINAL:
ya quedaron resultos los errores?

PLAN AUTORIZADO:
## 🧪 Chequeos reales ejecutados

| Chequeo | Resultado | Detalle |
|---|---|---|
| Sintaxis JS/JSON | ✅ pasa | 14 archivos compilados |
| Imports /

## Bloqueos / bugs conocidos
- errores verificados. Empezamos por los más sencillos y avanzamos por bloque.
- falló durante la ejecución: No pude autenticar el modelo. Revisa la API key en Modelos e intenta de nuevo.
- Actualizado: 2026-09-19 18:24
- Preview: desconocido — usa el preview del IDE, no inventes puertos

## Decisiones
- Ninguna registrada

## Cambios recientes
- [EditCore] project-infra.json — AUTORIZACION DE EJECUCION (PROCEDE): las reglas de DIAGNOSTICO / NO MODIFICAR del analisis previo qu
- [EditCore] src/server/db/index.ts — AUTORIZACION DE EJECUCION (PROCEDE): las reglas de DIAGNOSTICO / NO MODIFICAR del analisis previo qu
- [EditCore] src/routes/_app.red.tsx — AUTORIZACION DE EJECUCION (PROCEDE): las reglas de DIAGNOSTICO / NO MODIFICAR del analisis previo qu
- [EditCore] src/lib/api/distribution.functions.ts — AUTORIZACION DE EJECUCION (PROCEDE): las reglas de DIAGNOSTICO / NO MODIFICAR del analisis previo qu
- [EditCore] src/lib/api/red.functions.ts — AUTORIZACION DE EJECUCION (PROCEDE): las reglas de DIAGNOSTICO / NO MODIFICAR del analisis previo qu
- [EditCore] src/routes/_app.plataforma.tsx — AUTORIZACION DE EJECUCION (PROCEDE): las reglas de DIAGNOSTICO / NO MODIFICAR del analisis previo qu
- [EditCore] src/server/autopilot/generate.ts — AUTORIZACION DE EJECUCION (PROCEDE): las reglas de DIAGNOSTICO / NO MODIFICAR del analisis previo qu
- [EditCore] test-editcore-stack.js — Crea un archivo test-editcore-stack.js que exporte { ok: true }.
- src/lib/api/autopilot.functions.ts
- src/lib/api/calendar.functions.ts
- src/lib/api/distribution.functions.ts
- src/lib/api/red.functions.ts
- src/routes/_app.red.tsx
- src/routes/_app.plataforma.tsx
- src/server/autopilot/generate.ts
- src/server/brain/benchmarks.ts
- src/server/brain/server-diagnosis.ts
- src/server/context.ts
- src/server/metrics/sync.ts
- src/server/partners/admin.ts
- src/server/sync/user-data.ts
- src/server/whatsapp/inbound.ts
- src/lib/api/red.functions.ts — parche aplicado (kernel) (2026-10-06 21:12)
- src/lib/api/distribution.functions.ts — parche aplicado (kernel) (2026-10-06 21:12)
- src/lib/api/calendar.functions.ts — parche aplicado (kernel) (2026-10-06 21:12)
- src/lib/api/autopilot.functions.ts — parche aplicado (kernel) (2026-10-06 21:12)

## Verificado
- Pendiente

## Siguiente
- Proponer optimización o nueva funcionalidad.

## Regla anti-reexploracion
- Si el pedido del usuario apunta a un archivo ya listado arriba: ve DIRECTO a read_file/replace_in_file de ese path.
- PROHIBIDO list_files('.') / project_discovery / codebase_map del repo completo en el mismo turno si el Mapa ya tiene >= 5 entradas utiles.
- Tras mutar: EditCore refresca este ROADMAP; continua desde aqui en el siguiente mensaje.
