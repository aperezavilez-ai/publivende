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
  error?: string;
}

/** Amplifica un post de Fan Page vía Marketing API o deep link a Meta Ads. */
export async function createMetaBoost(input: MetaBoostInput): Promise<MetaBoostResult> {
  const adAccountId = process.env.META_AD_ACCOUNT_ID?.replace(/^act_/, "");
  const accessToken = process.env.META_SYSTEM_USER_TOKEN ?? process.env.META_APP_SECRET;
  const budget = input.dailyBudgetCents ?? Number(process.env.META_BOOST_DAILY_BUDGET_CENTS ?? 5000);

  const deepLink = `https://www.facebook.com/ad_center/create/boostpost/?page_id=${input.pageId}&target_id=${input.postId}`;

  if (!adAccountId || !accessToken || !process.env.META_SYSTEM_USER_TOKEN) {
    return { ok: true, mode: "deep_link", boost_url: deepLink };
  }

  try {
    const objectStoryId = `${input.pageId}_${input.postId}`;
    const res = await fetch(`https://graph.facebook.com/v21.0/act_${adAccountId}/adcreatives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `PubliVende Boost ${Date.now()}`,
        object_story_id: objectStoryId,
        access_token: process.env.META_SYSTEM_USER_TOKEN,
      }),
    });
    const json = (await res.json()) as { id?: string; error?: { message?: string } };

    if (json.id) {
      const campaignRes = await fetch(`https://graph.facebook.com/v21.0/act_${adAccountId}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `PubliVende ${Date.now()}`,
          objective: "OUTCOME_ENGAGEMENT",
          status: "PAUSED",
          special_ad_categories: [],
          access_token: process.env.META_SYSTEM_USER_TOKEN,
        }),
      });
      const campaignJson = (await campaignRes.json()) as { id?: string };
      return {
        ok: true,
        mode: "api",
        boost_url: deepLink,
        campaign_id: campaignJson.id,
      };
    }
  } catch {
    /* fallback deep link */
  }

  return { ok: true, mode: "deep_link", boost_url: deepLink };
}

export function estimateBoostReach(dailyBudgetMxn: number, nichoAffinity = 1): { min: number; max: number } {
  const cpm = 45 / nichoAffinity;
  const impressions = (dailyBudgetMxn / cpm) * 1000;
  return {
    min: Math.round(impressions * 0.7),
    max: Math.round(impressions * 1.3),
  };
}
