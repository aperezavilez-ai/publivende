import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadDB, saveDB, uid, seedForUser, ensureUserSeeded, userHasSeedData, initMinimalUser, getCurrentUser } from "./db";
import type { Profile, Plan } from "./types";

interface AuthCtx {
  user: Profile | null;
  loading: boolean;
  signUp: (data: { nombre: string; email: string; password: string; codigo_pais: string; celular: string; nombre_negocio: string; plan?: Plan }) => Promise<Profile>;
  signIn: (email: string, password: string) => Promise<Profile>;
  signOut: () => void;
  updateUser: (patch: Partial<Profile>) => void;
  changePlan: (plan: Plan) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

const ADMIN_ACCOUNTS: Array<{ email: string; password: string; nombre: string }> = [
  { email: "aperezavilez@gmail.com", password: "Calurore1028@", nombre: "Administrador" },
  { email: "alfonsoavilery@icloud.com", password: "Calurore1028@", nombre: "Alfonso" },
];

function ensureAdmin() {
  const db = loadDB();
  let changed = false;

  for (const { email, password, nombre } of ADMIN_ACCOUNTS) {
    const existing = db.profiles.find((p) => p.email === email);
    if (existing) {
      if (!existing.is_admin) { existing.is_admin = true; changed = true; }
      if (existing.plan !== "business") { existing.plan = "business"; changed = true; }
      if (existing.password !== password) { existing.password = password; changed = true; }
      if (!userHasSeedData(existing.id)) { seedForUser(existing.id); changed = true; }
      continue;
    }
    const adminId = uid();
    const admin: Profile = {
      id: adminId,
      nombre,
      email,
      password,
      celular: "5555555555",
      codigo_pais: "+52",
      nombre_negocio: "PubliVende Admin",
      industria: "moda",
      plan: "business",
      is_admin: true,
      whatsapp_configurado: true,
      onboarding_completado: true,
      fecha_registro: new Date().toISOString(),
    };
    db.profiles.push(admin);
    changed = true;
    seedForUser(adminId);
  }

  if (changed) saveDB(db);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureAdmin();
    const current = getCurrentUser();
    if (current) ensureUserSeeded(current.id);
    setUser(current);
    setLoading(false);
    const sync = () => setUser(getCurrentUser());
    window.addEventListener("publivende-db-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("publivende-db-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const signUp: AuthCtx["signUp"] = async (data) => {
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
    setUser(profile);
    return profile;
  };

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    const db = loadDB();
    const found = db.profiles.find((p) => p.email === email && p.password === password);
    if (!found) throw new Error("Credenciales incorrectas");
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
    setUser(null);
  };

  const updateUser = (patch: Partial<Profile>) => {
    const db = loadDB();
    const idx = db.profiles.findIndex((p) => p.id === user?.id);
    if (idx < 0) return;
    db.profiles[idx] = { ...db.profiles[idx], ...patch };
    saveDB(db);
    setUser(db.profiles[idx]);
  };

  const changePlan = (plan: Plan) => updateUser({ plan });

  return <Ctx.Provider value={{ user, loading, signUp, signIn, signOut, updateUser, changePlan }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth fuera de AuthProvider");
  return v;
}
