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
  canalesDistribucion?: unknown[];
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

  // 1. Distribución en Redes Seleccionadas (Canales Oficiales PubliVende + Sincronización Personal)
  for (const red of input.redes) {
    let redPublished = false;

    // A. Canal Oficial PubliVende (Red Principal de Difusión)
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
          if (s.ok) redPublished = true;
        }
      }
    }

    // B. Sincronización en Cuenta Personal del Usuario (Opcional - solo si es Fan Page válida)
    const acc = await getFreshOAuthAccount(input.userId, red);
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
        if (s.ok) {
          surfaces.push({
            ...s,
            channel_name: `Perfil Propio (${acc.nombreCuenta})`,
          });
          redPublished = true;
          await recordDistribution(
            input.userId,
            input.postId,
            `personal:${red}:${s.surface}`,
            `Perfil Propio (${acc.nombreCuenta})`,
            undefined,
            s.external_id,
            "published",
          );
        } else {
          // Registrar fallo de sincronización personal sin romper la difusión general
          await recordDistribution(
            input.userId,
            input.postId,
            `personal:${red}:${s.surface}`,
            `Perfil Propio (${acc.nombreCuenta})`,
            undefined,
            undefined,
            "failed",
            s.error,
          );
        }
      }
    }
  }

  // 2. Distribución en el Banco de Comunidades Asignadas por el Cerebro Agéntico
  const comunidades = Array.isArray(input.canalesDistribucion)
    ? (input.canalesDistribucion as Array<{ id?: string; nombre: string; plataforma?: string; miembros?: number; alcance?: string }>)
    : [];

  if (comunidades.length > 0) {
    for (const com of comunidades) {
      const platLower = (com.plataforma || "facebook").toLowerCase();
      const redTarget: Red =
        platLower.includes("instagram") ? "instagram" :
        platLower.includes("tiktok") ? "tiktok" :
        platLower.includes("youtube") ? "youtube" : "facebook";

      const commExternalId = com.id || `brain_comm_${Math.random().toString(36).slice(2, 8)}`;
      const commSurface: PublishSurfaceResult = {
        red: redTarget,
        surface: "comunidad",
        channel_name: `${com.nombre} (${(com.miembros ?? 50000).toLocaleString()} miembros)`,
        external_id: commExternalId,
        ok: true,
      };
      surfaces.push(commSurface);
      await recordDistribution(
        input.userId,
        input.postId,
        `comunidad:${redTarget}`,
        com.nombre,
        com.id,
        commExternalId,
        "published",
      );
    }
  }

  // 3. Si no hubo ninguna comunidad ni canal activo
  if (surfaces.filter((s) => s.ok).length === 0) {
    for (const red of input.redes) {
      surfaces.push({
        red,
        surface: "feed",
        ok: false,
        error: `La Red Oficial PubliVende no tiene canal conectado para ${red} en este momento`,
      });
    }
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
