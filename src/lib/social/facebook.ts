import axios from "axios";

const FB_API_VERSION = "v18.0";
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

export class FacebookService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getProfile() {
    const response = await axios.get(`${FB_API_BASE}/me`, {
      params: {
        fields: "id,name,picture,email",
        access_token: this.accessToken,
      },
    });
    return response.data;
  }

  async getPages() {
    const response = await axios.get(`${FB_API_BASE}/me/accounts`, {
      params: {
        access_token: this.accessToken,
      },
    });
    return response.data.data;
  }

  async publishPost(pageId: string, pageAccessToken: string, data: {
    message: string;
    media?: Array<{ url: string; type: "photo" | "video" }>;
    scheduled?: Date;
  }) {
    const params: any = {
      message: data.message,
      access_token: pageAccessToken,
    };

    if (data.scheduled) {
      params.published = false;
      params.scheduled_publish_time = Math.floor(data.scheduled.getTime() / 1000);
    }

    let endpoint = `${FB_API_BASE}/${pageId}`;

    if (data.media && data.media.length > 0) {
      if (data.media.length === 1) {
        // Post simple con una imagen/video
        if (data.media[0].type === "photo") {
          endpoint += "/photos";
          params.url = data.media[0].url;
        } else {
          endpoint += "/videos";
          params.file_url = data.media[0].url;
        }
      } else {
        // Carrusel (múltiples imágenes)
        const attachedMedia = [];
        for (const media of data.media) {
          const uploadResponse = await axios.post(
            `${FB_API_BASE}/${pageId}/photos`,
            {
              url: media.url,
              published: false,
              access_token: pageAccessToken,
            }
          );
          attachedMedia.push({ media_fbid: uploadResponse.data.id });
        }
        endpoint += "/feed";
        params.attached_media = JSON.stringify(attachedMedia);
      }
    } else {
      endpoint += "/feed";
    }

    const response = await axios.post(endpoint, params);
    return response.data;
  }

  async getPostInsights(postId: string) {
    const response = await axios.get(`${FB_API_BASE}/${postId}/insights`, {
      params: {
        metric: "post_impressions,post_engaged_users,post_clicks,post_reactions_like_total",
        access_token: this.accessToken,
      },
    });
    return response.data.data;
  }

  async deletePost(postId: string) {
    const response = await axios.delete(`${FB_API_BASE}/${postId}`, {
      params: {
        access_token: this.accessToken,
      },
    });
    return response.data;
  }
}

export async function exchangeCodeForToken(code: string) {
  const response = await axios.get(`${FB_API_BASE}/oauth/access_token`, {
    params: {
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      redirect_uri: `${process.env.APP_URL}/auth/facebook/callback`,
      code,
    },
  });
  return response.data.access_token;
}

export async function getLongLivedToken(shortToken: string) {
  const response = await axios.get(`${FB_API_BASE}/oauth/access_token`, {
    params: {
      grant_type: "fb_exchange_token",
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      fb_exchange_token: shortToken,
    },
  });
  return response.data;
}
