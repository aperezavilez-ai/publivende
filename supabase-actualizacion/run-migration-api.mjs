import { readFileSync } from "node:fs";

const env = readFileSync(".env", "utf8");
const tokenMatch = env.match(/SUPABASE_ACCESS_TOKEN=([^\r\n]+)/);
if (!tokenMatch) {
  console.error("FALTA SUPABASE_ACCESS_TOKEN en .env");
  process.exit(1);
}
const token = tokenMatch[1].trim();
const PROJECT_REF = "ckimjzfajaihaeqfgtoj";

const EXPECTED = {
  users: ["id", "email", "password_hash", "nombre", "celular", "codigo_pais", "nombre_negocio", "industria", "descripcion_negocio", "publico_objetivo", "tono_marca", "ciudad", "horario_atencion", "pago_provider_default", "plan", "stripe_customer_id", "stripe_subscription_id", "plan_status", "plan_renews_at", "is_admin", "whatsapp_configurado", "onboarding_completado", "fecha_registro", "created_at", "updated_at"],
  oauth_accounts: ["id", "user_id", "red", "nombre_cuenta", "avatar", "access_token", "refresh_token", "token_expires_at", "external_account_id", "oauth_provider", "estado_conexion", "metrics_synced_at", "metrics_error", "created_at", "updated_at"],
  posts: ["id", "user_id", "tipo", "media_url", "copy", "copy_por_red", "source_url", "alcance", "redes_destino", "estado", "fecha_programada", "fecha_publicacion", "tracking_slug", "hashtags_por_red", "hashtags_virales", "canales_distribucion", "nicho_label", "total_canales", "whatsapp_enviado_at", "whatsapp_broadcast_count", "external_ids", "publish_surfaces", "schedule_meta", "created_at"],
  productos: ["id", "user_id", "nombre", "precio", "moneda", "descripcion", "imagen", "link_pago", "pago_provider", "slug_publico", "activo", "created_at"],
  whatsapp_contacts: ["id", "user_id", "nombre", "celular", "etiqueta", "etapa", "origen", "post_origen_id", "notas", "monto_venta", "lead_score", "score_motivos", "no_leidos", "fecha_creacion"],
  whatsapp_messages: ["id", "contact_id", "user_id", "direccion", "texto", "automatico", "post_id", "wa_message_id", "created_at"],
  automation_rules: ["id", "user_id", "nombre", "disparador", "palabra_clave", "respuesta", "activa", "created_at"],
  whatsapp_accounts: ["id", "user_id", "waba_id", "phone_number_id", "display_phone_number", "verified_name", "access_token_encrypted", "token_expires_at", "estado_conexion", "created_at", "updated_at"],
  partners: ["id", "slug", "nombre", "brand_name", "logo_url", "primary_color", "allowed_return_origins", "webhook_url", "activo", "created_at", "updated_at"],
  partner_api_keys: ["id", "partner_id", "key_prefix", "key_hash", "label", "activo", "last_used_at", "created_at"],
  partner_users: ["id", "partner_id", "user_id", "external_user_id", "metadata", "created_at", "updated_at"],
  hosted_media: ["id", "user_id", "mime_type", "data_base64", "created_at"],
  post_distributions: ["id", "user_id", "post_id", "channel_type", "channel_id", "channel_name", "external_id", "status", "error", "created_at"],
  hub_channels: ["id", "red", "external_account_id", "nombre", "avatar", "access_token", "refresh_token", "token_expires_at", "oauth_provider", "nichos", "activo", "estado_conexion", "error", "created_at", "updated_at"],
  boost_requests: ["id", "user_id", "post_id", "estado", "nicho", "ia_score", "ia_motivo", "ia_fuente", "copy_red", "canales", "resultados", "motivo_rechazo", "created_at", "updated_at", "publicado_at"],
  post_metrics: ["id", "user_id", "post_id", "red", "external_id", "vistas", "alcance", "likes", "comentarios", "compartidos", "guardados", "clics", "raw", "fetched_at"],
  account_snapshots: ["id", "user_id", "red", "fecha", "seguidores", "publicaciones", "vistas_totales", "raw", "created_at"],
  brain_reports: ["id", "user_id", "score", "fuente", "diagnosis", "plan", "created_at"],
  autopilot_settings: ["user_id", "activo", "modo", "posts_semana", "redes", "ultima_generacion", "updated_at"],
  brain_kpis: ["user_id", "nicho", "score", "kpis", "updated_at"],
  niche_benchmarks: ["nicho", "negocios", "metricas", "ganchos", "updated_at"],
  user_data_snapshots: ["user_id", "data", "updated_at"]
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runQuery(query, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });
    if (res.status === 429) {
      const wait = attempt * 2000;
      console.log(`Rate limited (429). Esperando ${wait}ms (reintento ${attempt}/${retries})...`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    await sleep(80); // pequeño respiro para evitar throttling
    return await res.json();
  }
  throw new Error("Superado número máximo de reintentos por rate limit (429)");
}

async function main() {
  const sqlText = readFileSync(new URL("./supabase-actualizar-todo.sql", import.meta.url), "utf8");
  const statements = sqlText.split(/;\s*\n/).map(s => s.trim()).filter(s => s && (!s.startsWith("--") || s.includes("TABLE") || s.includes("INDEX")));
  const clean = statements.map(s => s.split("\n").filter(l => !l.trim().startsWith("--")).join("\n").trim()).filter(Boolean);

  console.log(`Ejecutando ${clean.length} sentencias SQL...`);
  let ok = 0, saltadas = 0;
  const errores = [];

  for (const st of clean) {
    try {
      await runQuery(st);
      ok++;
    } catch (e) {
      if (/already exists|ya existe|duplicate/i.test(e.message)) {
        saltadas++;
      } else {
        errores.push(`${st.slice(0, 60)}... -> ${e.message}`);
      }
    }
  }

  console.log(`Sentencias aplicadas: ${ok} | Ya existían/ignoradas: ${saltadas} | Errores: ${errores.length}`);
  if (errores.length > 0) {
    errores.slice(0, 10).forEach(e => console.log("ERROR:", e));
  }

  // Verificación 1: Conteo de tablas
  const tables = await runQuery("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
  const present = new Set(tables.map(r => r.table_name));
  const expectedTableNames = Object.keys(EXPECTED);
  const missingTables = expectedTableNames.filter(t => !present.has(t));
  console.log(`TABLAS: ${expectedTableNames.length - missingTables.length}/${expectedTableNames.length}`);
  if (missingTables.length > 0) {
    console.log(`FALTAN: ${missingTables.join(", ")}`);
  }

  // Verificación 2: Columnas de cada tabla
  let missingCols = [];
  for (const [t, cols] of Object.entries(EXPECTED)) {
    if (!present.has(t)) continue;
    const rows = await runQuery(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${t}';`);
    const have = new Set(rows.map(r => r.column_name));
    const miss = cols.filter(cc => !have.has(cc));
    if (miss.length) missingCols.push(`${t}: ${miss.join(", ")}`);
  }
  if (missingCols.length) {
    console.log("COLUMNAS FALTANTES:\n" + missingCols.join("\n"));
  } else {
    console.log("COLUMNAS: todas las del esquema actual están presentes");
  }

  // Verificación 3: Query a users (la del login)
  try {
    const u = await runQuery("SELECT id, email FROM users LIMIT 1;");
    console.log("CONSULTA users: OK, filas leídas:", u.length);
  } catch (e) {
    console.log("CONSULTA users: FALLÓ ->", e.message);
  }
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
