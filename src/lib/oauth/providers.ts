import type { Red } from "@/lib/mock/types";

export type OAuthProvider = "meta" | "google" | "tiktok";

export function providerForRed(red: Red): OAuthProvider | null {
  if (red === "facebook" || red === "instagram") return "meta";
  if (red === "youtube") return "google";
  if (red === "tiktok") return "tiktok";
  return null;
}

export function oauthProviderLabel(red: Red): string {
  const p = providerForRed(red);
  if (p === "meta") return "Meta (Facebook Login)";
  if (p === "google") return "Google (YouTube)";
  if (p === "tiktok") return "TikTok";
  return "OAuth";
}
