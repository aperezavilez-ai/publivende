export type Red = "facebook" | "instagram" | "tiktok" | "youtube";

export interface PubliVendeClientOptions {
  apiKey: string;
  /** Base URL, e.g. https://www.publivende.mx */
  baseUrl?: string;
}

export interface CreateUserInput {
  external_user_id: string;
  nombre?: string;
  nombre_negocio?: string;
  celular?: string;
  codigo_pais?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateUserResponse {
  external_user_id: string;
  user_id: string;
  created: boolean;
  connect_url: string;
}

export interface PublishInput {
  external_user_id: string;
  copy: string;
  redes?: Red[];
  media_url?: string;
  tipo?: "imagen" | "video" | "texto";
  copy_por_red?: Record<string, string>;
  notify_whatsapp?: boolean;
  programar?: string;
}

export interface PublishResponse {
  ok: boolean;
  status: "published" | "scheduled" | "partial" | "failed";
  external_user_id: string;
  post_id?: string;
  tracking_slug?: string;
  external_ids?: Partial<Record<Red, string>>;
  errors?: string[];
  wa_sent?: number;
  connect_url?: string;
}

export interface ConnectionsResponse {
  external_user_id: string;
  user_id: string;
  connections: {
    whatsapp: { connected: boolean; mode?: string; display_phone?: string };
    social: Record<string, { connected: boolean; nombre_cuenta?: string }>;
  };
}

export interface ConnectUrlResponse {
  external_user_id: string;
  platform: string;
  connect_url?: string;
  meta_onboard_url?: string;
}

export class PubliVendeError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "PubliVendeError";
  }
}

export class PubliVendeClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: PubliVendeClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "https://www.publivende.mx").replace(/\/$/, "");
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (body as { error?: string }).error ?? `HTTP ${res.status}`;
      throw new PubliVendeError(msg, res.status, body);
    }
    return body as T;
  }

  async createUser(input: CreateUserInput): Promise<CreateUserResponse> {
    return this.request<CreateUserResponse>("/api/v1/partners/users", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getConnections(externalUserId: string): Promise<ConnectionsResponse> {
    return this.request<ConnectionsResponse>(
      `/api/v1/partners/users/${encodeURIComponent(externalUserId)}/connections`,
    );
  }

  async getConnectUrl(
    externalUserId: string,
    platform: Red | "whatsapp" = "whatsapp",
    returnUrl?: string,
  ): Promise<ConnectUrlResponse> {
    const params = new URLSearchParams({
      external_user_id: externalUserId,
      platform,
    });
    if (returnUrl) params.set("return_url", returnUrl);
    return this.request<ConnectUrlResponse>(`/api/v1/partners/connect?${params}`);
  }

  async publish(input: PublishInput): Promise<PublishResponse> {
    return this.request<PublishResponse>("/api/v1/partners/publish", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  /** URL de la página white-label de conexión (sin llamar a la API). */
  connectPageUrl(partnerSlug: string, externalUserId: string, returnUrl?: string): string {
    const params = new URLSearchParams({ external_user_id: externalUserId });
    if (returnUrl) params.set("return_url", returnUrl);
    return `${this.baseUrl}/connect/${partnerSlug}?${params}`;
  }
}

export function verifyWebhookSignature(
  body: string,
  signatureHeader: string | null,
  sessionSecret: string,
  partnerId: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = signatureHeader.slice(7);
  try {
    const { createHmac, timingSafeEqual } = require("node:crypto") as typeof import("node:crypto");
    const computed = createHmac("sha256", `${sessionSecret}:${partnerId}`).update(body).digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(computed, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
