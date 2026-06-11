import { detectPlatform } from "./detectPlatform";

export type ImportInputKind = "url" | "fbadcode";

export interface NormalizedImportInput {
  kind: ImportInputKind;
  raw: string;
  url?: string;
  fbadcode?: string;
}

const FBAD_RE = /^fbadcode-[A-Za-z0-9_-]+$/i;

export function normalizeImportInput(raw: string): NormalizedImportInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (FBAD_RE.test(trimmed)) {
    return { kind: "fbadcode", raw: trimmed, fbadcode: trimmed };
  }

  const url = trimmed.match(/^https?:\/\//i) ? trimmed : `https://${trimmed}`;
  if (!detectPlatform(url)) return null;

  return { kind: "url", raw: trimmed, url };
}

export function isFacebookAdCode(raw: string): boolean {
  return FBAD_RE.test(raw.trim());
}
