export interface PublishDraft {
  copy?: string;
  media?: string;
  idea?: string;
  openIa?: boolean;
}

export interface CampaignDraft {
  keywords?: string;
  headline?: string;
  nombre?: string;
  openWizard?: boolean;
}

const PUBLISH_KEY = "publivende_publish_draft";
const CAMPAIGN_KEY = "publivende_campaign_draft";

export function setPublishDraft(draft: PublishDraft) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PUBLISH_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function consumePublishDraft(): PublishDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PUBLISH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PUBLISH_KEY);
    return JSON.parse(raw) as PublishDraft;
  } catch {
    return null;
  }
}

export function setCampaignDraft(draft: CampaignDraft) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CAMPAIGN_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function consumeCampaignDraft(): CampaignDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CAMPAIGN_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(CAMPAIGN_KEY);
    return JSON.parse(raw) as CampaignDraft;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// PERSISTENCIA DE BORRADOR EN LOCALSTORAGE (Cabina de Difusión & Publicar)
// Evita perder datos al recargar la página (F5, mobile swipe, etc.)
// -------------------------------------------------------------

export interface DashboardDraft {
  sourceUrl?: string;
  sourceMeta?: any;
  media?: string;
  copy?: string;
  copyPorRed?: Partial<Record<string, string>>;
  variants?: any;
  activeTabRed?: string;
  selectedRedes?: string[];
  whatsappSelected?: boolean;
  alcanceNivel?: string;
  detectedNicho?: string;
  brainResult?: any;
  reachAnalysis?: any;
  reachPorRed?: any[];
  totalAlcance?: { personas_min: number; personas_max: number };
  savedAt?: string;
}

const DASHBOARD_DRAFT_KEY = "pv_dashboard_draft_v1";

export function saveDashboardDraft(draft: DashboardDraft): void {
  if (typeof window === "undefined") return;
  try {
    // Solo guardar si hay algo relevante que valga la pena persistir
    const hasData = Boolean(
      draft.sourceUrl?.trim() ||
      draft.copy?.trim() ||
      draft.media?.trim() ||
      draft.sourceMeta ||
      draft.brainResult ||
      (draft.copyPorRed && Object.values(draft.copyPorRed).some(Boolean))
    );

    if (!hasData) {
      localStorage.removeItem(DASHBOARD_DRAFT_KEY);
      return;
    }

    const payload: DashboardDraft = {
      ...draft,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(DASHBOARD_DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // QuotaExceeded or privacy mode
  }
}

export function getDashboardDraft(): DashboardDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DASHBOARD_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardDraft;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDashboardDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DASHBOARD_DRAFT_KEY);
  } catch {
    // ignore
  }
}

export interface PublicarDraftPersistent {
  publishMode?: "ai_campaign" | "link" | "manual";
  sourceUrl?: string;
  sourceMeta?: any;
  media?: string;
  copy?: string;
  copyPorRed?: Partial<Record<string, string>>;
  variants?: any;
  redes?: string[];
  alcanceNivel?: string;
  campaignPrompt?: string;
  campaignTheme?: string;
  detectedNicho?: string;
  whatsappSelected?: boolean;
  savedAt?: string;
}

const PUBLICAR_DRAFT_KEY = "pv_publicar_draft_v1";

export function savePublicarDraft(draft: PublicarDraftPersistent): void {
  if (typeof window === "undefined") return;
  try {
    const hasData = Boolean(
      draft.sourceUrl?.trim() ||
      draft.copy?.trim() ||
      draft.media?.trim() ||
      draft.campaignPrompt?.trim() ||
      (draft.copyPorRed && Object.values(draft.copyPorRed).some(Boolean))
    );

    if (!hasData) {
      localStorage.removeItem(PUBLICAR_DRAFT_KEY);
      return;
    }

    const payload: PublicarDraftPersistent = {
      ...draft,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(PUBLICAR_DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function getPublicarDraft(): PublicarDraftPersistent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PUBLICAR_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PublicarDraftPersistent;
  } catch {
    return null;
  }
}

export function clearPublicarDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PUBLICAR_DRAFT_KEY);
  } catch {
    // ignore
  }
}
