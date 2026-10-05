import { eq } from "drizzle-orm";
import type { Red, PublishSurfaceResult } from "@/lib/mock/types";
import { resolveAppBaseUrl } from "@/lib/app-url";
import { getDb, schema } from "@/server/db";
import { getFreshOAuthAccount } from "@/server/auth/token-refresh";
import { publishToNetworkMulti } from "@/server/publish/networks";
import { ensurePublicMediaUrl } from "@/server/publish/host-media";
import { listHubChannels, getFreshHubToken } from "@/server/red/channels";
import type { NichoKey } from "@/services/import/inferNiche";

export interface ExpandDistributionInput {
  userId: string;
  postId: string;
  redes: Red[];
  copy: string;
  copyPorRed?: Partial<Record<Red, string>>;
  mediaUrl: string;
  mediaType: "imagen" | "video" | "texto";
  trackingSlug: string;
  nicho?: NichoKey;
  nichoLabel?: string;
}

export interface ExpandDistributionResult {
  surfaces: PublishSurfaceResult[];
}

async function recordDistribution(
  userId: string,
  postId: string,
  channelType: string,
  channelName: string,
  channelId: string | undefined,
  externalId: string | undefined,
  status: string,
  error?: string,
) {
  const db = getDb();
  await db.insert(schema.postDistributions).values({
    userId,
    postId,
    channelType,
    channelId,
    channelName,
    externalId,
    status,
    error,
  });
}

export async function expandDistribution(input: ExpandDistributionInput): Promise<ExpandDistributionResult> {
  const appUrl = resolveAppBaseUrl();

  const publicMedia = input.mediaUrl
    ? await ensurePublicMediaUrl(input.userId, input.mediaUrl)
    : "";

  const surfaces: PublishSurfaceResult[] = [];
  const hubChannels = await listHubChannels().catch(() => []);

  for (const red of input.redes) {
    const acc = await getFreshOAuthAccount(input.userId, red);

    // 1. Si el usuario tiene su propia cuenta conectada, publicar directamente
    if (acc?.accessToken) {
      const copy = input.copyPorRed?.[red] ?? input.copy;
      const networkResults = await publishToNetworkMulti({
        red,
        accessToken: acc.accessToken,
        pageId: acc.externalAccountId ?? undefined,
        copy,
        mediaUrl: publicMedia || input.mediaUrl,
        mediaType: input.mediaType === "video" ? "video" : "imagen",
        trackingSlug: input.trackingSlug,
        appUrl,
      });

      for (const s of networkResults) {
        surfaces.push(s);
        await recordDistribution(
          input.userId,
          input.postId,
          `${red}:${s.surface}`,
          s.channel_name ?? s.surface,
          undefined,
          s.external_id,
          s.ok ? "published" : "failed",
          s.error,
        );
      }
      continue;
    }

    // 2. Si el usuario NO tiene cuenta propia, distribuir a través de la Red Oficial PubliVende
    const hub = hubChannels.find((c) => c.red === red && c.activo && c.estadoConexion === "conectada");
    if (hub) {
      const hubToken = await getFreshHubToken(hub);
      if (hubToken) {
        const copy = input.copyPorRed?.[red] ?? input.copy;
        const hubResults = await publishToNetworkMulti({
          red,
          accessToken: hubToken,
          pageId: hub.externalAccountId,
          copy,
          mediaUrl: publicMedia || input.mediaUrl,
          mediaType: input.mediaType === "video" ? "video" : "imagen",
          trackingSlug: input.trackingSlug,
          appUrl,
        });

        for (const s of hubResults) {
          const surfaceResult: PublishSurfaceResult = {
            ...s,
            channel_name: `Red PubliVende (${hub.nombre})`,
          };
          surfaces.push(surfaceResult);
          await recordDistribution(
            input.userId,
            input.postId,
            `hub:${red}:${s.surface}`,
            `Red PubliVende (${hub.nombre})`,
            hub.id,
            s.external_id,
            s.ok ? "published" : "failed",
            s.error,
          );
        }
        continue;
      }
    }

    // 3. Ni el usuario ni PubliVende tienen esa red conectada
    surfaces.push({
      red,
      surface: "feed",
      ok: false,
      error: `Ni tu cuenta ni la Red Oficial PubliVende tienen ${red} conectado en este momento`,
    });
  }

  const db = getDb();
  const externalIds: Partial<Record<Red, string>> = {};
  for (const s of surfaces) {
    if (s.ok && s.external_id && !externalIds[s.red]) {
      externalIds[s.red] = s.external_id;
    }
  }

  await db
    .update(schema.posts)
    .set({
      publishSurfaces: surfaces,
      externalIds,
      totalCanales: surfaces.filter((s) => s.ok).length,
    })
    .where(eq(schema.posts.id, input.postId));

  return { surfaces };
}
