// Actualiza Supabase (proyecto oficial) al esquema actual de Publivende.
// Lee la cadena de conexion de PV_DB_URL (la pone PowerShell en la sesion; nunca se imprime).
import postgres from "postgres";
import { readFileSync } from "node:fs";

const url = process.env.PV_DB_URL;
if (!url) { console.error("FALTA PV_DB_URL en la sesion"); process.exit(1); }
const EXPECTED = {"users": ["id", "email", "password_hash", "nombre", "celular", "codigo_pais", "nombre_negocio", "industria", "descripcion_negocio", "publico_objetivo", "tono_marca", "ciudad", "horario_atencion", "pago_provider_default", "plan", "stripe_customer_id", "stripe_subscription_id", "plan_status", "plan_renews_at", "is_admin", "whatsapp_configurado", "onboarding_completado", "fecha_registro", "created_at", "updated_at"], "oauth_accounts": ["id", "user_id", "red", "nombre_cuenta", "avatar", "access_token", "refresh_token", "token_expires_at", "external_account_id", "oauth_provider", "estado_conexion", "metrics_synced_at", "metrics_error", "created_at", "updated_at"], "posts": ["id", "user_id", "tipo", "media_url", "copy", "copy_por_red", "source_url", "alcance", "redes_destino", "estado", "fecha_programada", "fecha_publicacion", "tracking_slug", "hashtags_por_red", "hashtags_virales", "canales_distribucion", "nicho_label", "total_canales", "whatsapp_enviado_at", "whatsapp_broadcast_count", "external_ids", "publish_surfaces", "schedule_meta", "created_at"], "productos": ["id", "user_id", "nombre", "precio", "moneda", "descripcion", "imagen", "link_pago", "pago_provider", "slug_publico", "activo", "created_at"], "whatsapp_contacts": ["id", "user_id", "nombre", "celular", "etiqueta", "etapa", "origen", "post_origen_id", "notas", "monto_venta", "lead_score", "score_motivos", "no_leidos", "fecha_creacion"], "whatsapp_messages": ["id", "contact_id", "user_id", "direccion", "texto", "automatico", "post_id", "wa_message_id", "created_at"], "automation_rules": ["id", "user_id", "nombre", "disparador", "palabra_clave", "respuesta", "activa", "created_at"], "whatsapp_accounts": ["id", "user_id", "waba_id", "phone_number_id", "display_phone_number", "verified_name", "access_token_encrypted", "token_expires_at", "estado_conexion", "created_at", "updated_at"], "partners": ["id", "slug", "nombre", "brand_name", "logo_url", "primary_color", "allowed_return_origins", "webhook_url", "activo", "created_at", "updated_at"], "partner_api_keys": ["id", "partner_id", "key_prefix", "key_hash", "label", "activo", "last_used_at", "created_at"], "partner_users": ["id", "partner_id", "user_id", "external_user_id", "metadata", "created_at", "updated_at"], "hosted_media": ["id", "user_id", "mime_type", "data_base64", "created_at"], "post_distributions": ["id", "user_id", "post_id", "channel_type", "channel_id", "channel_name", "external_id", "status", "error", "created_at"], "hub_channels": ["id", "red", "external_account_id", "nombre", "avatar", "access_token", "refresh_token", "token_expires_at", "oauth_provider", "nichos", "activo", "estado_conexion", "error", "created_at", "updated_at"], "boost_requests": ["id", "user_id", "post_id", "estado", "nicho", "ia_score", "ia_motivo", "ia_fuente", "copy_red", "canales", "resultados", "motivo_rechazo", "created_at", "updated_at", "publicado_at"], "post_metrics": ["id", "user_id", "post_id", "red", "external_id", "vistas", "alcance", "likes", "comentarios", "compartidos", "guardados", "clics", "raw", "fetched_at"], "account_snapshots": ["id", "user_id", "red", "fecha", "seguidores", "publicaciones", "vistas_totales", "raw", "created_at"], "brain_reports": ["id", "user_id", "score", "fuente", "diagnosis", "plan", "created_at"], "autopilot_settings": ["user_id", "activo", "modo", "posts_semana", "redes", "ultima_generacion", "updated_at"], "brain_kpis": ["user_id", "nicho", "score", "kpis", "updated_at"], "niche_benchmarks": ["nicho", "negocios", "metricas", "ganchos", "updated_at"], "user_data_snapshots": ["user_id", "data", "updated_at"]};
const sqlText = readFileSync(new URL("./supabase-actualizar-todo.sql", import.meta.url), "utf8");
const statements = sqlText.split(/;\s*\n/).map(s => s.trim()).filter(s => s && !s.startsWith("--") || s.includes("TABLE") || s.includes("INDEX"));
const clean = statements.map(s => s.split("\n").filter(l => !l.trim().startsWith("--")).join("\n").trim()).filter(Boolean);
const sql = postgres(url, { max: 1, prepare: false, ssl: "require", connect_timeout: 20 });
let ok = 0, saltadas = 0; const errores = [];
for (const st of clean) {
  try { await sql.unsafe(st); ok++; }
  catch (e) {
    if (/already exists|ya existe|duplicate/i.test(e.message)) saltadas++;
    else errores.push(`${st.slice(0, 60)}... -> ${e.message}`);
  }
}
console.log(`Sentencias aplicadas: ${ok} | ya existian: ${saltadas} | errores: ${errores.length}`);
errores.slice(0, 10).forEach(e => console.log("ERROR:", e));
const tables = await sql`select table_name from information_schema.tables where table_schema = 'public'`;
const present = new Set(tables.map(r => r.table_name));
const missingTables = Object.keys(EXPECTED).filter(t => !present.has(t));
console.log(`TABLAS: ${Object.keys(EXPECTED).length - missingTables.length}/${Object.keys(EXPECTED).length}` + (missingTables.length ? ` FALTAN: ${missingTables.join(", ")}` : ""));
let missingCols = [];
for (const [t, cols] of Object.entries(EXPECTED)) {
  if (!present.has(t)) continue;
  const rows = await sql`select column_name from information_schema.columns where table_schema = 'public' and table_name = ${t}`;
  const have = new Set(rows.map(r => r.column_name));
  const miss = cols.filter(cc => !have.has(cc));
  if (miss.length) missingCols.push(`${t}: ${miss.join(", ")}`);
}
console.log(missingCols.length ? "COLUMNAS FALTANTES:\n" + missingCols.join("\n") : "COLUMNAS: todas las del esquema actual estan presentes");
try { const u = await sql`select id, email from users limit 1`; console.log("CONSULTA users (la del login): OK, filas leidas:", u.length); }
catch (e) { console.log("CONSULTA users: FALLO ->", e.message); }
await sql.end();
