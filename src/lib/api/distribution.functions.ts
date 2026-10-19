import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { isProductionMode } from "@/server/config";
import { verifySessionToken } from "@/server/auth/crypto";
import { getDb, schema } from "@/server/db";
import { getOAuthAccount } from "@/server/auth/users";
import { dbPostToClient } from "@/server/publish/service";
import { expandDistribution } from "@/server/distribution/expand";
import { createMetaBoost, estimateBoostReach } from "@/server/ads/meta-boost";
import type { Red } from "@/lib/mock/types";

export const getPostDistribution = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), postId: z.string().uuid() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere producción" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const db = getDb();
    const rows = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.id, data.postId))
      .limit(1);
    const post = rows[0];
    if (!post || post.userId !== session.userId) {
      return { ok: false as const, error: "Publicación no encontrada" };
    }

    const distributions = await db
      .select()
      .from(schema.postDistributions)
      .where(eq(schema.postDistributions.postId, data.postId));

    return {
      ok: true as const,
      post: dbPostToClient(post),
      distributions: distributions.map((d: {
        id: string;
        channelType: string;
        channelName: string;
        channelId: string;
        externalId: string | null;
        status: string;
        error: string | null;
        createdAt: Date;
      }) => ({
        id: d.id,
        channel_type: d.channelType,
        channel_name: d.channelName,
        channel_id: d.channelId ?? "",
        external_id: d.externalId,
        status: d.status,
        error: d.error,
        created_at: d.createdAt.toISOString(),
      })),
    };
  });

export const redistributePost = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), postId: z.string().uuid() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere producción" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const db = getDb();
    const rows = await db.select().from(schema.posts).where(eq(schema.posts.id, data.postId)).limit(1);
    const post = rows[0];
    if (!post || post.userId !== session.userId) {
      return { ok: false as const, error: "Publicación no encontrada" };
    }

    const previous = await db
      .select()
      .from(schema.postDistributions)
      .where(eq(schema.postDistributions.postId, data.postId));
    for (const d of previous.filter((p: { channelType: string }) => !p.channelType.startsWith("red_publivende:"))) {
      await db.delete(schema.postDistributions).where(eq(schema.postDistributions.id, d.id));
    }

    const result = await expandDistribution({
      userId: session.userId,
      postId: post.id,
      redes: (post.redesDestino ?? []) as Red[],
      copy: post.copy,
      copyPorRed: post.copyPorRed ?? undefined,
      mediaUrl: post.mediaUrl,
      mediaType: post.tipo as "imagen" | "video" | "texto",
      trackingSlug: post.trackingSlug,
      nichoLabel: post.nichoLabel ?? undefined,
    });

    return {
      ok: true as const,
      surfaces: result.surfaces,
    };
  });

export const getMetaBoostForPost = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      postId: z.string().uuid(),
      dailyBudgetMxn: z.number().min(50).max(50000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere producción" };
    const session = await verifySessionToken(data.token);
    if (!session) return { ok: false as const, error: "Sesión inválida" };

    const db = getDb();
    const rows = await db.select().from(schema.posts).where(eq(schema.posts.id, data.postId)).limit(1);
    const post = rows[0];
    if (!post || post.userId !== session.userId) {
      return { ok: false as const, error: "Publicación no encontrada" };
    }

    const fbAcc = await getOAuthAccount(session.userId, "facebook");
    const fbPostId = post.externalIds?.facebook;
    if (!fbAcc?.externalAccountId || !fbPostId) {
      return {
        ok: false as const,
        error: "Publica primero en Facebook para amplificar este post",
      };
    }

    const budgetMxn = data.dailyBudgetMxn ?? 50;
    const boost = await createMetaBoost({
      pageId: fbAcc.externalAccountId,
      postId: fbPostId,
      dailyBudgetCents: budgetMxn * 100,
    });

    const reach = estimateBoostReach(budgetMxn);

    return {
      ok: true as const,
      boost_url: boost.boost_url,
      mode: boost.mode,
      estimated_reach: reach,
      daily_budget_mxn: budgetMxn,
    };
  });
