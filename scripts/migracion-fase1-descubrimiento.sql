-- FASE 1 — Descubrimiento real (Publivende)
-- Ejecutar UNA vez en el SQL Editor de Supabase (proyecto oficial de Publivende).
-- Es idempotente: se puede correr de nuevo sin daño.
-- Agrega la procedencia/verificación a brain_communities y marca todo el
-- catálogo sembrado a mano como "catalogo_sin_verificar" en estado_prospecto
-- (la columna "estado" es la entidad federativa y NO se toca). No cuenta como
-- alcance real hasta que el motor lo observe de verdad en la red).

ALTER TABLE brain_communities ADD COLUMN IF NOT EXISTS fuente text;
ALTER TABLE brain_communities ADD COLUMN IF NOT EXISTS estado_prospecto text NOT NULL DEFAULT 'catalogo_sin_verificar';
ALTER TABLE brain_communities ADD COLUMN IF NOT EXISTS verificado_en timestamptz;
ALTER TABLE brain_communities ADD COLUMN IF NOT EXISTS evidencia_url text;

UPDATE brain_communities
SET estado_prospecto = 'catalogo_sin_verificar'
WHERE fuente IS NULL AND estado_prospecto IS DISTINCT FROM 'descubierto';
