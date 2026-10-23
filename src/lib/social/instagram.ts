import axios from "axios";

const IG_API_VERSION = "v18.0";
const IG_API_BASE = `https://graph.facebook.com/${IG_API_VERSION}`;

export class InstagramService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getBusinessAccounts() {
    const response = await axios.get(`${IG_API_BASE}/me/accounts`, {
      params: {
        fields: "instagram_business_account",
        access_token: this.accessToken,
      },
    });

    const accounts = [];
    for (const page of response.data.data) {
      if (page.instagram_business_account) {
        const igAccount = await this.getAccountInfo(page.instagram_business_account.id);
        accounts.push(igAccount);
      }
    }
    return accounts;
  }

  async getAccountInfo(accountId: string) {
    const response = await axios.get(`${IG_API_BASE}/${accountId}`, {
      params: {
        fields: "id,username,name,profile_picture_url,followers_count,follows_count,media_count",
        access_token: this.accessToken,
      },
    });
    return response.data;
  }

  async createMediaContainer(accountId: string, data: {
    imageUrl?: string;
    videoUrl?: string;
    caption: string;
    isCarousel?: boolean;
    children?: string[];
  }) {
    const params: any = {
      caption: data.caption,
      access_token: this.accessToken,
    };

    if (data.isCarousel && data.children) {
      params.media_type = "CAROUSEL";
      params.children = data.children.join(",");
    } else if (data.videoUrl) {
      params.media_type = "REELS";
      params.video_url = data.videoUrl;
    } else if (data.imageUrl) {
      params.image_url = data.imageUrl;
    }

    const response = await axios.post(
      `${IG_API_BASE}/${accountId}/media`,
      params
    );
    return response.data.id;
  }

  async createCarouselItem(accountId: string, imageUrl: string) {
    const response = await axios.post(
      `${IG_API_BASE}/${accountId}/media`,
      {
        image_url: imageUrl,
        is_carousel_item: true,
        access_token: this.accessToken,
      }
    );
    return response.data.id;
  }

  async publishMedia(accountId: string, creationId: string) {
    const response = await axios.post(
      `${IG_API_BASE}/${accountId}/media_publish`,
      {
        creation_id: creationId,
        access_token: this.accessToken,
      }
    );
    return response.data;
  }

  async publishPost(accountId: string, data: {
    caption: string;
    media: Array<{ url: string; type: "image" | "video" }>;
  }) {
    if (data.media.length === 0) {
      throw new Error("Instagram requiere al menos una imagen o video");
    }

    if (data.media.length === 1) {
      // Post simple
      const creationId = await this.createMediaContainer(accountId, {
        imageUrl: data.media[0].type === "image" ? data.media[0].url : undefined,
        videoUrl: data.media[0].type === "video" ? data.media[0].url : undefined,
        caption: data.caption,
      });

      return await this.publishMedia(accountId, creationId);
    } else {
      // Carrusel
      const children = [];
      for (const item of data.media) {
        if (item.type === "image") {
          const childId = await this.createCarouselItem(accountId, item.url);
          children.push(childId);
        }
      }

      const creationId = await this.createMediaContainer(accountId, {
        caption: data.caption,
        isCarousel: true,
        children,
      });

      return await this.publishMedia(accountId, creationId);
    }
  }

  async getMediaInsights(mediaId: string) {
    const response = await axios.get(`${IG_API_BASE}/${mediaId}/insights`, {
      params: {
        metric: "impressions,reach,engagement,saved,likes,comments,shares",
        access_token: this.accessToken,
      },
    });
    return response.data.data;
  }

  async getComments(mediaId: string) {
    const response = await axios.get(`${IG_API_BASE}/${mediaId}/comments`, {
      params: {
        fields: "id,text,username,timestamp,like_count,replies",
        access_token: this.accessToken,
      },
    });
    return response.data.data;
  }

  async replyToComment(commentId: string, message: string) {
    const response = await axios.post(
      `${IG_API_BASE}/${commentId}/replies`,
      {
        message,
        access_token: this.accessToken,
      }
    );
    return response.data;
  }
}
