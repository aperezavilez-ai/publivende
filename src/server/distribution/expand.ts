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
          // El fallo de la cuenta personal SÍ llega a las superficies: es el
          // error real de la red (Meta) y el usuario debe verlo, no quedar
          // tapado por un mensaje genérico.
          surfaces.push({
            ...s,
            channel_name: `Perfil Propio (${acc.nombreCuenta})`,
          });
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

  // 2. canalesDistribucion es solo la ETIQUETA del plan (qué redes eligió el
  // usuario); NO es una publicación. Ninguna superficie se marca publicada
  // sin una llamada real a la red con external_id devuelto por la red.
  // (Antes este bloque fabricaba superficies ok:true con IDs inventados
  // «brain_comm_…» sin llamar a ninguna red, y el post quedaba «publicado»
  // aunque todas las redes reales hubieran fallado.)

  // 3. Si no hubo ningún canal activo
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
