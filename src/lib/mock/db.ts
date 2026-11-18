import type { DB, Profile, Red } from "./types";

const KEY = "publivende_db_v1";

let cachedRaw: string | null | undefined;
let cachedDb: DB | null = null;
let dbVersion = 0;

export function getDBVersion() {
  return dbVersion;
}

function invalidateCache() {
  cachedRaw = undefined;
  cachedDb = null;
  dbVersion++;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) invalidateCache();
  });
}

export const defaultAdminProfile: Profile = {
  id: "admin-aperezavilez",
  nombre: "Luis Avilés",
  email: "aperezavilez@gmail.com",
  password: "",
  codigo_pais: "+52",
  celular: "5512345678",
  nombre_negocio: "PubliVende",
  plan: "business",
  is_admin: true,
  whatsapp_configurado: true,
  onboarding_completado: true,
  fecha_registro: "2026-01-01T00:00:00.000Z",
};

const emptyDB: DB = {
  profiles: [defaultAdminProfile],
  social_accounts: [],
  posts: [],
  post_metrics: [],
  whatsapp_contacts: [],
  whatsapp_messages: [],
  automation_rules: [],
  media_assets: [],
  inbox: [],
  productos: [],
  ad_campaigns: [],
  ad_metrics: [],
  marketplace_recetas: [],
  ab_experiments: [],
  session_user_id: null,
};

export function loadDB(): DB {
  if (typeof window === "undefined") return { ...emptyDB, profiles: [...emptyDB.profiles] };
  const raw = localStorage.getItem(KEY);
  if (raw === cachedRaw && cachedDb) return cachedDb;
  cachedRaw = raw;
  if (!raw) {
    cachedDb = { ...emptyDB, profiles: [...emptyDB.profiles] };
    return cachedDb;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DB>;
    const loadedProfiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];
    const adminIdx = loadedProfiles.findIndex((p) => p.email.toLowerCase() === defaultAdminProfile.email.toLowerCase());
    if (adminIdx >= 0) {
      loadedProfiles[adminIdx].is_admin = true;
      loadedProfiles[adminIdx].plan = "business";
    } else {
      loadedProfiles.push({ ...defaultAdminProfile });
    }
    cachedDb = {
      ...emptyDB,
      ...parsed,
      profiles: loadedProfiles,
      ab_experiments: Array.isArray(parsed.ab_experiments) ? parsed.ab_experiments : [],
    };
  } catch {
    cachedDb = { ...emptyDB, profiles: [...emptyDB.profiles] };
  }
  return cachedDb;
}

export function saveDB(db: DB) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(db);
  localStorage.setItem(KEY, raw);
  cachedRaw = raw;
  cachedDb = db;
  dbVersion++;
  window.dispatchEvent(new Event("publivende-db-change"));
}

export function uid() { return crypto.randomUUID(); }
export function slug() { return Math.random().toString(36).slice(2, 10); }

const REDES: Red[] = ["instagram", "tiktok", "facebook", "youtube"];



const AVATARS = (n: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(n)}`;

/** Solo cuentas de redes vacías — para usuarios nuevos antes del onboarding. */
export function initMinimalUser(userId: string, nombreNegocio: string) {
  const db = loadDB();
  if (db.social_accounts.some((a) => a.user_id === userId)) return;
  const labels: Record<Red, string> = {
    instagram: "Conectar Instagram",
    tiktok: "Conectar TikTok",
    facebook: "Conectar Facebook",
    youtube: "Conectar YouTube",
  };
  REDES.forEach((red) => {
    db.social_accounts.push({
      id: uid(), user_id: userId, red,
      nombre_cuenta: labels[red],
      avatar: AVATARS(red),
      estado_conexion: "desconectada",
      token_placeholder: "",
    });
  });
  saveDB(db);
}

export function seedForUser(_userId: string) {
  // Real v1 — DESACTIVADA a propósito.
  // Antes sembraba 20 posts, métricas, contactos, campañas y recetas con
  // datos inventados (Math.random) que se mezclaban con las cuentas reales,
  // incluida la del admin. Ningún dato inventado debe aparecer como si
  // fuera actividad real: las cuentas nuevas arrancan vacías y se
  // alimentan del onboarding y de las conexiones reales.
  // Se conserva la firma porque auth.tsx y otros llamadores la invocan;
  // como no-op, ningún llamador se rompe.
  return;
}

export function userHasSeedData(userId: string): boolean {
  const db = loadDB();
  return db.whatsapp_contacts.some((c) => c.user_id === userId)
    || db.posts.some((p) => p.user_id === userId);
}

/** Real v1: ya NO carga datos demo (seedForUser es no-op). Las cuentas se alimentan vía onboarding y conexiones reales. */
export function ensureUserSeeded(userId: string): boolean {
  const db = loadDB();
  const profile = db.profiles.find((p) => p.id === userId);
  if (!profile?.is_admin) return false;
  if (userHasSeedData(userId)) return false;
  seedForUser(userId);
  return true;
}

export function getCurrentUser(): Profile | null {
  const db = loadDB();
  if (!db.session_user_id) return null;
  return db.profiles.find((p) => p.id === db.session_user_id) ?? null;
}
