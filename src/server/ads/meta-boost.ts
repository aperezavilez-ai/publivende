import process from "node:process";

export interface MetaBoostInput {
  pageId: string;
  postId: string;
  dailyBudgetCents?: number;
}

export interface MetaBoostResult {
  ok: boolean;
  mode: "api" | "deep_link";
  boost_url: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  error?: string;
}

/**
 * Real v2 — Boost pagado HONESTO.
 * Antes: sin credenciales devolvía { ok:true, mode:"deep_link" } sin pautar
 * nada, y con credenciales dejaba una campaña en PAUSED sin adset ni ad.
 * Ahora: o se crea la cadena completa campaña → adset → creative → ad en
 * estado ACTIVE (pauta real), o devuelve ok:false con el error claro.
 * El deep link se incluye solo como alternativa manual, nunca como éxito.
 */
export async function createMetaBoost(input: MetaBoostInput): Promise<MetaBoostResult> {
  const adAccountId = process.env.META_AD_ACCOUNT_ID?.replace(/^act_/, "");
  const accessToken = process.env.META_SYSTEM_USER_TOKEN;
  const budget = input.dailyBudgetCents ?? Number(process.env.META_BOOST_DAILY_BUDGET_CENTS ?? 5000);

  const deepLink = `https://www.facebook.com/ad_center/create/boostpost/?page_id=${input.pageId}&target_id=${input.postId}`;

  if (!adAccountId || !accessToken) {
    return {
      ok: false,
      mode: "deep_link",
      boost_url: deepLink,
      error:
        "El boost pagado no está configurado en el servidor (falta META_AD_ACCOUNT_ID o META_SYSTEM_USER_TOKEN). No se creó ninguna pauta.",
    };
  }

  const api = async (path: string, body: Record<string, unknown>) => {
    const res = await fetch(`https://graph.facebook.com/v21.0/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, access_token: accessToken }),
    });
    const json = (await res.json()) as { id?: string; error?: { message?: string } };
    if (!res.ok || !json.id) {
      throw new Error(json.error?.message ?? `Meta respondió HTTP ${res.status} en ${path}`);
    }
    return json.id;
  };

  try {
    const stamp = Date.now();
    const campaignId = await api(`act_${adAccountId}/campaigns`, {
      name: `PubliVende Boost ${stamp}`,
      objective: "OUTCOME_ENGAGEMENT",
      status: "ACTIVE",
      special_ad_categories: [],
    });
    const adsetId = await api(`act_${adAccountId}/adsets`, {
      name: `PubliVende Boost AdSet ${stamp}`,
      campaign_id: campaignId,
      daily_budget: budget,
      billing_event: "IMPRESSIONS",
      optimization_goal: "POST_ENGAGEMENT",
      status: "ACTIVE",
      targeting: { geo_locations: { countries: ["MX"] } },
    });
    const creativeId = await api(`act_${adAccountId}/adcreatives`, {
      name: `PubliVende Boost Creative ${stamp}`,
      object_story_id: `${input.pageId}_${input.postId}`,
    });
    const adId = await api(`act_${adAccountId}/ads`, {
      name: `PubliVende Boost Ad ${stamp}`,
      adset_id: adsetId,
      creative: { creative_id: creativeId },
      status: "ACTIVE",
    });
    return {
      ok: true,
      mode: "api",
      boost_url: deepLink,
      campaign_id: campaignId,
      adset_id: adsetId,
      ad_id: adId,
    };
  } catch (err) {
    return {
      ok: false,
      mode: "api",
      boost_url: deepLink,
      error: `No se pudo crear la pauta en Meta: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function estimateBoostReach(dailyBudgetMxn: number, nichoAffinity = 1): { min: number; max: number } {
  const cpm = 45 / nichoAffinity;
  const impressions = (dailyBudgetMxn / cpm) * 1000;
  return {
    min: Math.round(impressions * 0.7),
    max: Math.round(impressions * 1.3),
  };
}
