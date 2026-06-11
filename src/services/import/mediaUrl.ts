const BLOCKED_IMAGE_RE = [
  /hsts-pixel/i,
  /security\/hsts/i,
  /\/tr\?/i,
  /pixel\.gif/i,
  /favicon/i,
  /logo.*\.(svg|png)/i,
];

export function isValidMediaUrl(url: string | undefined | null): boolean {
  if (!url?.trim()) return false;
  const u = url.trim();
  if (u.length < 8) return false;
  if (BLOCKED_IMAGE_RE.some((re) => re.test(u))) return false;
  if (u.startsWith("data:image/")) return true;
  if (u.startsWith("blob:")) return true;
  if (u.startsWith("/")) return true;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeMediaUrl(url: string | undefined | null): string {
  return isValidMediaUrl(url) ? url!.trim() : "";
}

export function needsMediaProxy(url: string): boolean {
  if (!url.startsWith("http")) return false;
  return /fbcdn\.net|facebook\.com|instagram\.com|cdninstagram\.com/i.test(url);
}
