export type SourcePlatform = "instagram" | "facebook" | "tiktok" | "youtube";

export function detectPlatform(url: string): SourcePlatform | null {
  const u = url.trim().toLowerCase();
  if (!u) return null;
  if (u.includes("instagram.com") || u.includes("instagr.am")) return "instagram";
  if (u.includes("facebook.com") || u.includes("fb.watch") || u.includes("fb.com") || u.includes("fb.me")) return "facebook";
  if (u.includes("tiktok.com") || u.includes("vm.tiktok.com")) return "tiktok";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  return null;
}

export const SOURCE_LABELS: Record<SourcePlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
};
