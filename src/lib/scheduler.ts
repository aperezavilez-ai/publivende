import { db } from "@/db";
import { posts, postNetworks, socialConnections } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { FacebookService } from "./social/facebook";
import { InstagramService } from "./social/instagram";
import { TwitterService } from "./social/twitter";
import { TikTokService } from "./social/tiktok";

export async function publishScheduledPosts() {
  const now = new Date();

  // Obtener posts programados que deben publicarse
  const scheduledPosts = await db.query.posts.findMany({
    where: and(
      eq(posts.estado, "programado"),
      lte(posts.fechaProgramada, now)
    ),
    with: {
      postNetworks: {
        with: {
          connection: true,
        },
      },
    },
  });

  for (const post of scheduledPosts) {
    for (const postNetwork of post.postNetworks) {
      try {
        await publishToNetwork(post, postNetwork);
      } catch (error) {
        console.error(`Error publicando en ${postNetwork.red}:`, error);
        await db
          .update(postNetworks)
          .set({
            estado: "fallido",
            errorMessage: error instanceof Error ? error.message : "Error desconocido",
            retries: postNetwork.retries + 1,
          })
          .where(eq(postNetworks.id, postNetwork.id));
      }
    }

    // Actualizar estado del post principal
    const allPublished = post.postNetworks.every(pn => pn.estado === "publicado");
    const anyFailed = post.postNetworks.some(pn => pn.estado === "fallido");

    await db
      .update(posts)
      .set({
        estado: allPublished ? "publicado" : anyFailed ? "fallido" : "programado",
        publishedAt: allPublished ? now : undefined,
      })
      .where(eq(posts.id, post.id));
  }
}

async function publishToNetwork(post: any, postNetwork: any) {
  const connection = postNetwork.connection;
  const contenido = post.contenidoPorRed?.[postNetwork.red] || post.contenido;

  let result;

  switch (postNetwork.red) {
    case "facebook":
      result = await publishToFacebook(connection, contenido, post.medios);
      break;
    case "instagram":
      result = await publishToInstagram(connection, contenido, post.medios);
      break;
    case "twitter":
      result = await publishToTwitter(connection, contenido, post.medios);
      break;
    case "tiktok":
      result = await publishToTikTok(connection, contenido, post.medios);
      break;
    default:
      throw new Error(`Red social no soportada: ${postNetwork.red}`);
  }

  await db
    .update(postNetworks)
    .set({
      estado: "publicado",
      externalPostId: result.id,
      externalUrl: result.url,
      publishedAt: new Date(),
    })
    .where(eq(postNetworks.id, postNetwork.id));
}

async function publishToFacebook(connection: any, contenido: string, medios: any[]) {
  const service = new FacebookService(connection.accessToken);

  const mediaData = medios?.map(m => ({
    url: m.url,
    type: m.tipo === "video" ? "video" : "photo",
  }));

  const result = await service.publishPost(connection.accountId, connection.accessToken, {
    message: contenido,
    media: mediaData,
  });

  return {
    id: result.id,
    url: `https://facebook.com/${result.id}`,
  };
}

async function publishToInstagram(connection: any, contenido: string, medios: any[]) {
  const service = new InstagramService(connection.accessToken);

  if (!medios || medios.length === 0) {
    throw new Error("Instagram requiere al menos una imagen o video");
  }

  const mediaData = medios.map(m => ({
    url: m.url,
    type: m.tipo === "video" ? "video" : "image",
  }));

  const result = await service.publishPost(connection.accountId, {
    caption: contenido,
    media: mediaData,
  });

  return {
    id: result.id,
    url: `https://instagram.com/p/${result.id}`,
  };
}

async function publishToTwitter(connection: any, contenido: string, medios: any[]) {
  const service = new TwitterService(connection.accessToken);

  const mediaIds = [];
  if (medios && medios.length > 0) {
    for (const medio of medios.slice(0, 4)) { // Twitter permite máximo 4 imágenes
      const mediaId = await service.uploadMedia(medio.url);
      mediaIds.push(mediaId);
    }
  }

  const result = await service.createTweet({
    text: contenido,
    media_ids: mediaIds.length > 0 ? mediaIds : undefined,
  });

  return {
    id: result.id,
    url: `https://twitter.com/i/web/status/${result.id}`,
  };
}

async function publishToTikTok(connection: any, contenido: string, medios: any[]) {
  const service = new TikTokService(connection.accessToken);

  const video = medios?.find(m => m.tipo === "video");
  if (!video) {
    throw new Error("TikTok requiere un video");
  }

  const result = await service.uploadVideo(video.url, {
    title: contenido.substring(0, 150),
    description: contenido,
  });

  return {
    id: result.publish_id,
    url: `https://tiktok.com/@${connection.accountUsername}/video/${result.publish_id}`,
  };
}

export async function syncMetrics() {
  const publishedPosts = await db.query.postNetworks.findMany({
    where: eq(postNetworks.estado, "publicado"),
    with: {
      connection: true,
      post: true,
    },
  });

  for (const postNetwork of publishedPosts) {
    try {
      const metrics = await fetchMetrics(postNetwork);

      await db
        .update(postNetworks)
        .set({
          vistas: metrics.vistas,
          likes: metrics.likes,
          comentarios: metrics.comentarios,
          compartidos: metrics.compartidos,
          guardados: metrics.guardados,
          reach: metrics.reach,
          impressions: metrics.impressions,
          lastMetricsUpdateAt: new Date(),
        })
        .where(eq(postNetworks.id, postNetwork.id));

      // Actualizar métricas agregadas del post
      await updatePostAggregatedMetrics(postNetwork.postId);
    } catch (error) {
      console.error(`Error sincronizando métricas de ${postNetwork.red}:`, error);
    }
  }
}

async function fetchMetrics(postNetwork: any) {
  const connection = postNetwork.connection;

  switch (postNetwork.red) {
    case "facebook": {
      const service = new FacebookService(connection.accessToken);
      const insights = await service.getPostInsights(postNetwork.externalPostId);
      return parseFacebookInsights(insights);
    }
    case "instagram": {
      const service = new InstagramService(connection.accessToken);
      const insights = await service.getMediaInsights(postNetwork.externalPostId);
      return parseInstagramInsights(insights);
    }
    case "twitter": {
      const service = new TwitterService(connection.accessToken);
      const metrics = await service.getTweetMetrics(postNetwork.externalPostId);
      return parseTwitterMetrics(metrics);
    }
    case "tiktok": {
      const service = new TikTokService(connection.accessToken);
      const insights = await service.getVideoInsights(postNetwork.externalPostId);
      return parseTikTokInsights(insights);
    }
    default:
      return {
        vistas: 0,
        likes: 0,
        comentarios: 0,
        compartidos: 0,
        guardados: 0,
        reach: 0,
        impressions: 0,
      };
  }
}

function parseFacebookInsights(insights: any[]) {
  const impressions = insights.find(i => i.name === "post_impressions")?.values[0]?.value || 0;
  const engaged = insights.find(i => i.name === "post_engaged_users")?.values[0]?.value || 0;
  const clicks = insights.find(i => i.name === "post_clicks")?.values[0]?.value || 0;
  const likes = insights.find(i => i.name === "post_reactions_like_total")?.values[0]?.value || 0;

  return {
    vistas: impressions,
    likes,
    comentarios: 0,
    compartidos: 0,
    guardados: 0,
    reach: engaged,
    impressions,
    clicks,
  };
}

function parseInstagramInsights(insights: any[]) {
  return {
    vistas: insights.find(i => i.name === "impressions")?.values[0]?.value || 0,
    likes: insights.find(i => i.name === "likes")?.values[0]?.value || 0,
    comentarios: insights.find(i => i.name === "comments")?.values[0]?.value || 0,
    compartidos: insights.find(i => i.name === "shares")?.values[0]?.value || 0,
    guardados: insights.find(i => i.name === "saved")?.values[0]?.value || 0,
    reach: insights.find(i => i.name === "reach")?.values[0]?.value || 0,
    impressions: insights.find(i => i.name === "impressions")?.values[0]?.value || 0,
  };
}

function parseTwitterMetrics(metrics: any) {
  const publicMetrics = metrics.public_metrics || {};
  const organicMetrics = metrics.organic_metrics || {};

  return {
    vistas: organicMetrics.impression_count || 0,
    likes: publicMetrics.like_count || 0,
    comentarios: publicMetrics.reply_count || 0,
    compartidos: publicMetrics.retweet_count || 0,
    guardados: 0,
    reach: organicMetrics.impression_count || 0,
    impressions: organicMetrics.impression_count || 0,
  };
}

function parseTikTokInsights(insights: any) {
  return {
    vistas: insights.view_count || 0,
    likes: insights.like_count || 0,
    comentarios: insights.comment_count || 0,
    compartidos: insights.share_count || 0,
    guardados: 0,
    reach: insights.view_count || 0,
    impressions: insights.view_count || 0,
  };
}

async function updatePostAggregatedMetrics(postId: string) {
  const networks = await db.query.postNetworks.findMany({
    where: eq(postNetworks.postId, postId),
  });

  const aggregated = networks.reduce(
    (acc, network) => ({
      vistas: acc.vistas + (network.vistas || 0),
      likes: acc.likes + (network.likes || 0),
      comentarios: acc.comentarios + (network.comentarios || 0),
      compartidos: acc.compartidos + (network.compartidos || 0),
      guardados: acc.guardados + (network.guardados || 0),
      clicks: acc.clicks + (network.clicks || 0),
    }),
    { vistas: 0, likes: 0, comentarios: 0, compartidos: 0, guardados: 0, clicks: 0 }
  );

  await db
    .update(posts)
    .set(aggregated)
    .where(eq(posts.id, postId));
}
