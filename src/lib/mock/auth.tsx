import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadDB, saveDB, uid, seedForUser, ensureUserSeeded, userHasSeedData, initMinimalUser, getCurrentUser } from "./db";
import type { Profile, Plan } from "./types";
import { authGetSession, authSignIn, authSignUp, authUpdateProfile, getProductionStatus } from "@/lib/api/auth.functions";
import {
  clearSessionToken,
  getSessionToken,
  setProductionModeFlag,
  setSessionToken,
} from "@/lib/production/session";
import { loadUserDataServer, syncUserDataServer } from "@/lib/api/whatsapp.functions";

interface AuthCtx {
  user: Profile | null;
  loading: boolean;
  productionMode: boolean;
  signUp: (data: { nombre: string; email: string; password: string; codigo_pais: string; celular: string; nombre_negocio: string; plan?: Plan }) => Promise<Profile>;
  signIn: (email: string, password: string) => Promise<Profile>;
  signOut: () => void;
  updateUser: (patch: Partial<Profile>) => void;
  /** En producción redirige a Stripe Checkout; en demo cambia el plan localmente. */
  changePlan: (plan: Plan) => Promise<void>;
  openBillingPortal: () => Promise<void>;
}

async function redirectToPlanCheckout(token: string, plan: Exclude<Plan, "free">) {
  const { createPlanCheckoutServer } = await import("@/lib/api/billing.functions");
  const res = await createPlanCheckoutServer({ data: { token, plan } });
  if (!res.ok) throw new Error(res.error);
  window.location.href = res.url;
}

const Ctx = createContext<AuthCtx | null>(null);

/** Solo modo demo (sin base de datos): emails que se vuelven admin al registrarse localmente. */
const DEMO_ADMIN_EMAILS = [
  "aperezavilez@gmail.com",
  ...(import.meta.env.VITE_DEMO_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean),
];

function ensureAdmin() {
  if (!DEMO_ADMIN_EMAILS.length) return;
  const db = loadDB();
  let changed = false;

  for (const existing of db.profiles) {
    if (!DEMO_ADMIN_EMAILS.includes(existing.email.toLowerCase())) continue;
    if (!existing.is_admin) { existing.is_admin = true; changed = true; }
    if (existing.plan !== "business") { existing.plan = "business"; changed = true; }
    if (!userHasSeedData(existing.id)) { seedForUser(existing.id); changed = true; }
  }

  if (changed) saveDB(db);
}

async function hydrateLocalFromServer(token: string) {
  const remote = await loadUserDataServer({ data: { token } });
  if (!remote.ok || !remote.data) return;
  const db = loadDB();
  Object.assign(db, remote.data);
  saveDB(db);
}

async function syncLocalToServer(token: string) {
  const db = loadDB();
  await syncUserDataServer({ data: { token, data: db } });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [productionMode, setProductionMode] = useState(false);

  useEffect(() => {
    async function init() {
      const status = await getProductionStatus();
      setProductionMode(status.production);
      setProductionModeFlag(status.production);

      if (status.production) {
        const token = getSessionToken();
        if (token) {
          const session = await authGetSession({ data: { token } });
          if (session.ok) {
            await hydrateLocalFromServer(token);
            const db = loadDB();
            const idx = db.profiles.findIndex((p) => p.id === session.user.id);
            if (idx >= 0) db.profiles[idx] = session.user;
            else db.profiles.push(session.user);
            db.session_user_id = session.user.id;
            saveDB(db);
            setUser(session.user);
            setLoading(false);
            return;
          }
          clearSessionToken();
        }
      } else {
        ensureAdmin();
        const current = getCurrentUser();
        if (current) ensureUserSeeded(current.id);
        setUser(current);
      }
      setLoading(false);
    }

    init();

    const sync = () => setUser(getCurrentUser());
    window.addEventListener("publivende-db-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("publivende-db-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const sessionUserId = user?.id;
  useEffect(() => {
    if (!productionMode || !sessionUserId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      const token = getSessionToken();
      if (token) syncLocalToServer(token).catch(() => undefined);
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, 2500);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden" && timer) flush();
    };
    window.addEventListener("publivende-db-change", schedule);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("publivende-db-change", schedule);
      document.removeEventListener("visibilitychange", onHide);
      if (timer) flush();
    };
  }, [productionMode, sessionUserId]);

  const signUp: AuthCtx["signUp"] = async (data) => {
    if (productionMode) {
      const res = await authSignUp({ data });
      if (!res.ok) throw new Error(res.error);
      setSessionToken(res.token);
      const db = loadDB();
      db.profiles.push(res.user);
      db.session_user_id = res.user.id;
      initMinimalUser(res.user.id, res.user.nombre_negocio);
      saveDB(db);
      await syncLocalToServer(res.token);
      setUser(res.user);
      if (data.plan && data.plan !== "free") {
        await redirectToPlanCheckout(res.token, data.plan).catch(() => undefined);
      }
      return res.user;
    }

    const db = loadDB();
    if (db.profiles.find((p) => p.email === data.email)) throw new Error("Ya existe una cuenta con ese email");
    const profile: Profile = {
      id: uid(),
      nombre: data.nombre,
      email: data.email,
      password: data.password,
      codigo_pais: data.codigo_pais,
      celular: data.celular,
      nombre_negocio: data.nombre_negocio,
      plan: data.plan ?? "free",
      whatsapp_configurado: false,
      onboarding_completado: false,
      fecha_registro: new Date().toISOString(),
    };
    db.profiles.push(profile);
    db.session_user_id = profile.id;
    saveDB(db);
    initMinimalUser(profile.id, profile.nombre_negocio);
    ensureAdmin();
    const fresh = getCurrentUser() ?? profile;
    setUser(fresh);
    return fresh;
  };

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    if (productionMode) {
      const res = await authSignIn({ data: { email, password } });
      if (!res.ok) throw new Error(res.error);
      setSessionToken(res.token);
      await hydrateLocalFromServer(res.token);
      const db = loadDB();
      const idx = db.profiles.findIndex((p) => p.id === res.user.id);
      if (idx >= 0) db.profiles[idx] = res.user;
      else db.profiles.push(res.user);
      db.session_user_id = res.user.id;
      saveDB(db);
      setUser(res.user);
      return res.user;
    }

    const db = loadDB();
    const emailNorm = email.trim().toLowerCase();
    const found = db.profiles.find((p) => p.email.toLowerCase() === emailNorm);
    if (!found) {
      throw new Error("No existe una cuenta con este correo. Cambia a 'Crear cuenta' para registrarte.");
    }
    if (found.password !== password) {
      throw new Error("Contraseña incorrecta. Por favor verifica tus datos.");
    }
    db.session_user_id = found.id;
    saveDB(db);
    ensureUserSeeded(found.id);
    setUser(found);
    return found;
  };

  const signOut = () => {
    const db = loadDB();
    db.session_user_id = null;
    saveDB(db);
    clearSessionToken();
    setUser(null);
  };

  const updateUser = (patch: Partial<Profile>) => {
    const db = loadDB();
    const idx = db.profiles.findIndex((p) => p.id === user?.id);
    if (idx < 0) return;
    db.profiles[idx] = { ...db.profiles[idx], ...patch };
    saveDB(db);
    setUser(db.profiles[idx]);

    const token = getSessionToken();
    if (productionMode && token) {
      authUpdateProfile({ data: { token, patch } }).catch(() => undefined);
      syncLocalToServer(token).catch(() => undefined);
    }
  };

  const changePlan = async (plan: Plan) => {
    const token = getSessionToken();
    if (!productionMode || !token) {
      updateUser({ plan });
      return;
    }
    if (plan === "free") {
      await openBillingPortal();
      return;
    }
    await redirectToPlanCheckout(token, plan);
  };

  const openBillingPortal = async () => {
    const token = getSessionToken();
    if (!productionMode || !token) throw new Error("Disponible solo en producción");
    const { createBillingPortalServer } = await import("@/lib/api/billing.functions");
    const res = await createBillingPortalServer({ data: { token } });
    if (!res.ok) throw new Error(res.error);
    window.location.href = res.url;
  };

  return (
    <Ctx.Provider value={{ user, loading, productionMode, signUp, signIn, signOut, updateUser, changePlan, openBillingPortal }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth fuera de AuthProvider");
  return v;
}
