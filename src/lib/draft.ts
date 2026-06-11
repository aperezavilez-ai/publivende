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
  sessionStorage.setItem(PUBLISH_KEY, JSON.stringify(draft));
}

export function consumePublishDraft(): PublishDraft | null {
  const raw = sessionStorage.getItem(PUBLISH_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PUBLISH_KEY);
  try {
    return JSON.parse(raw) as PublishDraft;
  } catch {
    return null;
  }
}

export function setCampaignDraft(draft: CampaignDraft) {
  sessionStorage.setItem(CAMPAIGN_KEY, JSON.stringify(draft));
}

export function consumeCampaignDraft(): CampaignDraft | null {
  const raw = sessionStorage.getItem(CAMPAIGN_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(CAMPAIGN_KEY);
  try {
    return JSON.parse(raw) as CampaignDraft;
  } catch {
    return null;
  }
}
