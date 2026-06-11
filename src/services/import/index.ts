export { detectPlatform, SOURCE_LABELS, type SourcePlatform } from "./detectPlatform";
export { normalizeImportInput, isFacebookAdCode, type ImportInputKind } from "./detectInput";
export { fetchMetadataFromLink, type SourceMetadata } from "./fetchMetadata";
export { adaptForNetworks, variantsToCopyMap, type NetworkVariant } from "./adaptForNetworks";
export { getNicheHashtags } from "./nicheHashtags";
export {
  detectStorePlatform,
  importStoreFromLink,
  getStorePlatformLabel,
  type StorePlatform,
  type StoreImportResult,
  type ImportedStoreProduct,
} from "./storeImport";

import { fetchMetadataFromLink } from "./fetchMetadata";
import { adaptForNetworks, variantsToCopyMap } from "./adaptForNetworks";
import type { Red } from "@/lib/mock/types";
import type { Tono } from "@/services/ai/mock";
import type { SourceMetadata } from "./fetchMetadata";
import type { NetworkVariant } from "./adaptForNetworks";

export interface RepurposeResult {
  source: SourceMetadata;
  variants: Partial<Record<Red, NetworkVariant>>;
  copyPorRed: Partial<Record<Red, string>>;
}

export async function repurposeFromLink(
  url: string,
  targets: Red[],
  industria: string,
  tono: Tono = "casual",
  existingSource?: SourceMetadata,
): Promise<RepurposeResult> {
  const source = existingSource ?? await fetchMetadataFromLink(url);
  const variants = await adaptForNetworks(source, targets, industria, tono);
  return { source, variants, copyPorRed: variantsToCopyMap(variants) };
}
