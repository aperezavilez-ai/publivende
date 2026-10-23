import axios from "axios";

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

export class TikTokService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    };
  }

  async getUserInfo() {
    const response = await axios.get(`${TIKTOK_API_BASE}/user/info/`, {
      headers: this.getHeaders(),
      params: {
        fields: "open_id,union_id,avatar_url,display_name,follower_count,following_count,likes_count,video_count",
      },
    });
    return response.data.data.user;
  }

  async uploadVideo(videoUrl: string, data: {
    title: string;
    description?: string;
    privacy_level?: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY";
    disable_duet?: boolean;
    disable_comment?: boolean;
    disable_stitch?: boolean;
  }) {
    // Paso 1: Inicializar upload
    const initResponse = await axios.post(
      `${TIKTOK_API_BASE}/post/publish/inbox/video/init/`,
      {
        post_info: {
          title: data.title,
          description: data.description || "",
          privacy_level: data.privacy_level || "PUBLIC_TO_EVERYONE",
          disable_duet: data.disable_duet || false,
          disable_comment: data.disable_comment || false,
          disable_stitch: data.disable_stitch || false,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: 0, // Se actualizará
        },
      },
      { headers: this.getHeaders() }
    );

    const { publish_id, upload_url } = initResponse.data.data;

    // Paso 2: Subir video
    const videoBuffer = await axios.get(videoUrl, { responseType: "arraybuffer" });
    await axios.put(upload_url, videoBuffer.data, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": videoBuffer.data.byteLength,
      },
    });

    // Paso 3: Confirmar publicación
    const publishResponse = await axios.post(
      `${TIKTOK_API_BASE}/post/publish/status/fetch/`,
      { publish_id },
      { headers: this.getHeaders() }
    );

    return publishResponse.data.data;
  }

  async getVideoInsights(videoId: string) {
    const response = await axios.post(
      `${TIKTOK_API_BASE}/video/query/`,
      {
        filters: {
          video_ids: [videoId],
        },
        fields: ["like_count", "comment_count", "share_count", "view_count"],
      },
      { headers: this.getHeaders() }
    );
    return response.data.data.videos[0];
  }

  async getComments(videoId: string) {
    const response = await axios.post(
      `${TIKTOK_API_BASE}/comment/list/`,
      {
        video_id: videoId,
        max_count: 50,
      },
      { headers: this.getHeaders() }
    );
    return response.data.data.comments;
  }
}

export async function exchangeCodeForToken(code: string) {
  const response = await axios.post("https://open.tiktokapis.com/v2/oauth/token/", {
    client_key: process.env.TIKTOK_CLIENT_KEY,
    client_secret: process.env.TIKTOK_CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: `${process.env.APP_URL}/auth/tiktok/callback`,
  });
  return response.data;
}

export async function refreshAccessToken(refreshToken: string) {
  const response = await axios.post("https://open.tiktokapis.com/v2/oauth/token/", {
    client_key: process.env.TIKTOK_CLIENT_KEY,
    client_secret: process.env.TIKTOK_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return response.data;
}
