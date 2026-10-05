import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { loadDB, saveDB } from "@/lib/mock/db";
import { brainInputFromDB, diagnose, type Diagnosis } from "./diagnose";
import type { BrainReport } from "./plan";

const MAX_REPORTS = 12;

/** Diagnóstico recalculado cada vez que cambia la base local (posts, métricas, CRM…). */
export function useDiagnosis(): Diagnosis | null {
  const { user } = useAuth();
  return useDB((db) => (user ? diagnose(brainInputFromDB(db, user)) : null));
}

export function useBrainReports(): BrainReport[] {
  const { user } = useAuth();
  return useDB((db) => (db.brain_reports ?? []).filter((r) => r.user_id === user?.id));
}

export function saveBrainReport(report: BrainReport) {
  const db = loadDB();
  const all = (db.brain_reports ?? []).filter((r) => r.id !== report.id);
  const mine = [...all.filter((r) => r.user_id === report.user_id), report]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-MAX_REPORTS);
  db.brain_reports = [...all.filter((r) => r.user_id !== report.user_id), ...mine];
  saveDB(db);
}
