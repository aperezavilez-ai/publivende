-- FASE 1 — Primeras filas REALES del directorio (Publivende)
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de migracion-fase1-descubrimiento.sql.
-- Cada fila fue observada en el índice web el 2026-11-26: nombre real, URL real
-- y seguidores tal como el índice los mostró en la publicación citada como
-- evidencia. Nada de esto es estimado ni inventado. Idempotente por URL.

INSERT INTO brain_communities (niche_id, plataforma, nombre, url, pais, estado, ciudad, tipo_alcance, miembros_estimados, nivel_interaccion, activo, fuente, estado_prospecto, verificado_en, evidencia_url)
SELECT 'belleza_tatuajes', 'facebook_page', 'Tatuarte en la Piel', 'https://www.facebook.com/tatuarteenlapiel', 'México', 'General', NULL, 'nacional', 300000, 'alta', true, 'indice_web', 'descubierto', '2026-11-26T15:00:00Z', 'https://www.facebook.com/tatuarteenlapiel/posts/pfbid02891MdrXWemA6VC57H6puC3VjYXeAjD2SeQc3evjKtKtR8woFX9D3KJX5HGG44cREl'
WHERE NOT EXISTS (SELECT 1 FROM brain_communities WHERE url = 'https://www.facebook.com/tatuarteenlapiel');

INSERT INTO brain_communities (niche_id, plataforma, nombre, url, pais, estado, ciudad, tipo_alcance, miembros_estimados, nivel_interaccion, activo, fuente, estado_prospecto, verificado_en, evidencia_url)
SELECT 'belleza_tatuajes', 'facebook_page', 'Alynana', 'https://www.facebook.com/alynanaoficial', 'México', 'General', NULL, 'nacional', 260000, 'alta', true, 'indice_web', 'descubierto', '2026-11-26T15:00:00Z', 'https://www.facebook.com/alynanaoficial/posts/pfbid02s6XuLWvZkKkWYRdoAEojd2kSNsd26m3doxSgzk3wCPwqGN6AyMiDvoWyuZBQ7terl'
WHERE NOT EXISTS (SELECT 1 FROM brain_communities WHERE url = 'https://www.facebook.com/alynanaoficial');

INSERT INTO brain_communities (niche_id, plataforma, nombre, url, pais, estado, ciudad, tipo_alcance, miembros_estimados, nivel_interaccion, activo, fuente, estado_prospecto, verificado_en, evidencia_url)
SELECT 'automotriz', 'facebook_page', 'Outlet DE Llantas Mztdos', 'https://www.facebook.com/profile.php?id=61579197217611', 'México', 'Sinaloa', 'Mazatlán', 'local', 1400, 'media', true, 'indice_web', 'descubierto', '2026-11-26T15:00:00Z', 'https://www.facebook.com/permalink.php?story_fbid=pfbid0vVSaKBPSkdRjge3DdXssfnnMfV4aZPYhqz7TNM72dgnz7muDDyrv8LDfn5DSayawl&id=61579197217611'
WHERE NOT EXISTS (SELECT 1 FROM brain_communities WHERE url = 'https://www.facebook.com/profile.php?id=61579197217611');

INSERT INTO brain_communities (niche_id, plataforma, nombre, url, pais, estado, ciudad, tipo_alcance, miembros_estimados, nivel_interaccion, activo, fuente, estado_prospecto, verificado_en, evidencia_url)
SELECT 'automotriz', 'facebook_page', 'Llantas Royal de Sinaloa', 'https://www.facebook.com/profile.php?id=61595340091003', 'México', 'Sinaloa', 'Mazatlán', 'local', 7900, 'media', true, 'indice_web', 'descubierto', '2026-11-26T15:00:00Z', 'https://www.facebook.com/permalink.php?story_fbid=pfbid02C71MJZ7gWmE6wj2isMK7e5zQ5oq62kGhqB7homTzZiV82yy4ztdqwqHduYConYQxl&id=61595340091003'
WHERE NOT EXISTS (SELECT 1 FROM brain_communities WHERE url = 'https://www.facebook.com/profile.php?id=61595340091003');

INSERT INTO brain_communities (niche_id, plataforma, nombre, url, pais, estado, ciudad, tipo_alcance, miembros_estimados, nivel_interaccion, activo, fuente, estado_prospecto, verificado_en, evidencia_url)
SELECT 'automotriz', 'facebook_page', 'Llantera Del Pacifico', 'https://www.facebook.com/profile.php?id=61590763502783', 'México', 'Sinaloa', 'Mazatlán', 'local', 120, 'media', true, 'indice_web', 'descubierto', '2026-11-26T15:00:00Z', 'https://www.facebook.com/permalink.php?story_fbid=pfbid0zjp6xJydX6Jscj5LZGDFyGnJVbkp7mRQyhwS9igoAaYGsnpSD3ecvQRBALcaRR7Rl&id=61590763502783'
WHERE NOT EXISTS (SELECT 1 FROM brain_communities WHERE url = 'https://www.facebook.com/profile.php?id=61590763502783');

INSERT INTO brain_communities (niche_id, plataforma, nombre, url, pais, estado, ciudad, tipo_alcance, miembros_estimados, nivel_interaccion, activo, fuente, estado_prospecto, verificado_en, evidencia_url)
SELECT 'automotriz', 'facebook_page', 'Llantera Movil - Llantera García - Mazatlán a Domicilio', 'https://www.facebook.com/LlanteraMovilLlanteraGarciaLlanteraMazatlan', 'México', 'Sinaloa', 'Mazatlán', 'local', 270, 'media', true, 'indice_web', 'descubierto', '2026-11-26T15:00:00Z', 'https://www.facebook.com/LlanteraMovilLlanteraGarciaLlanteraMazatlan/posts/pfbid0ZrNv5JFNrzpMZnY42X2qXyUY71EThZ9BXEeehXQcSdfnmcvA7LBy8NZu5QxjCsjul'
WHERE NOT EXISTS (SELECT 1 FROM brain_communities WHERE url = 'https://www.facebook.com/LlanteraMovilLlanteraGarciaLlanteraMazatlan');
