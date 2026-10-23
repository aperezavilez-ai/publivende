import axios from "axios";

const TWITTER_API_BASE = "https://api.twitter.com/2";

export class TwitterService {
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

  async getMe() {
    const response = await axios.get(`${TWITTER_API_BASE}/users/me`, {
      headers: this.getHeaders(),
      params: {
        "user.fields": "id,name,username,profile_image_url,public_metrics",
      },
    });
    return response.data.data;
  }

  async createTweet(data: {
    text: string;
    media_ids?: string[];
    reply_settings?: "everyone" | "mentionedUsers" | "following";
  }) {
    const payload: any = {
      text: data.text,
    };

    if (data.media_ids && data.media_ids.length > 0) {
      payload.media = {
        media_ids: data.media_ids,
      };
    }

    if (data.reply_settings) {
      payload.reply_settings = data.reply_settings;
    }

    const response = await axios.post(
      `${TWITTER_API_BASE}/tweets`,
      payload,
      { headers: this.getHeaders() }
    );
    return response.data.data;
  }

  async uploadMedia(mediaUrl: string) {
    // Twitter requiere subir media a través de v1.1 API
    const mediaBuffer = await axios.get(mediaUrl, { responseType: "arraybuffer" });

    const formData = new FormData();
    formData.append("media", new Blob([mediaBuffer.data]), "media");

    const response = await axios.post(
      "https://upload.twitter.com/1.1/media/upload.json",
      formData,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );
    return response.data.media_id_string;
  }

  async getTweetMetrics(tweetId: string) {
    const response = await axios.get(`${TWITTER_API_BASE}/tweets/${tweetId}`, {
      headers: this.getHeaders(),
      params: {
        "tweet.fields": "public_metrics,non_public_metrics,organic_metrics",
      },
    });
    return response.data.data;
  }

  async deleteTweet(tweetId: string) {
    const response = await axios.delete(
      `${TWITTER_API_BASE}/tweets/${tweetId}`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async getReplies(tweetId: string) {
    const response = await axios.get(
      `${TWITTER_API_BASE}/tweets/search/recent`,
      {
        headers: this.getHeaders(),
        params: {
          query: `conversation_id:${tweetId}`,
          "tweet.fields": "author_id,created_at,public_metrics",
          max_results: 100,
        },
      }
    );
    return response.data.data || [];
  }
}

export async function exchangeCodeForToken(code: string, codeVerifier: string) {
  const response = await axios.post(
    "https://api.twitter.com/2/oauth2/token",
    new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: process.env.TWITTER_API_KEY!,
      redirect_uri: `${process.env.APP_URL}/auth/twitter/callback`,
      code_verifier: codeVerifier,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      auth: {
        username: process.env.TWITTER_API_KEY!,
        password: process.env.TWITTER_API_SECRET!,
      },
    }
  );
  return response.data;
}
