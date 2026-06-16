// Tipos compartidos para toda la app PubliVende
export type Red = "facebook" | "instagram" | "tiktok" | "youtube";
export type Plan = "free" | "pro" | "business";
export type EtapaLead = "nuevo" | "contactado" | "negociando" | "ganado" | "perdido";
export type EstadoPost = "borrador" | "programado" | "publicado" | "error";

export interface ScheduleMeta {
  auto_repurpose?: boolean;
  notify_whatsapp?: boolean;
  tono?: "casual" | "profesional" | "formal";
  schedule_error?: string;
  ia_snapshot?: {
    nicho_label?: string;
    alcance_personas_min?: number;
    alcance_personas_max?: number;
    total_canales?: number;
    hashtags_virales?: string[];
  };
  ads_estimate?: {
    cpl_mxn: number;
    conversion_pct: number;
    leads_min: number;
    leads_max: number;
  };
}
export type TipoPost = "imagen" | "video" | "texto";
export type PagoProvider = "mercadopago" | "payu" | "wompi" | "kushki" | "stripe" | "manual";

export interface Profile {
  id: string;
  nombre: string;
  email: string;
  password: string;
  celular: string;
  codigo_pais: string;
  nombre_negocio: string;
  industria?: string;
  descripcion_negocio?: string;
  publico_objetivo?: string;
  tono_marca?: string;
  ciudad?: string;
  horario_atencion?: string;
  pago_provider_default?: PagoProvider;
  plan: Plan;
  is_admin?: boolean;
  whatsapp_configurado: boolean;
  onboarding_completado: boolean;
  fecha_registro: string;
}

export interface SocialAccount {
  id: string;
  user_id: string;
  red: Red;
  nombre_cuenta: string;
  avatar: string;
  estado_conexion: "conectada" | "desconectada";
  token_placeholder: string;
  external_account_id?: string;
  token_expires_at?: string;
  oauth_provider?: "meta" | "google" | "tiktok";
}

export interface PostAlcance {
  tipo: "global" | "local";
  pais?: string;
  pais_codigo?: string;
  estado?: string;
  ciudad?: string;
  radio_km?: number;
}

export interface CanalDistribucion {
  red: Red;
  canal: string;
  cantidad: number;
  descripcion: string;
}

export interface Post {
  id: string;
  user_id: string;
  tipo: TipoPost;
  media_url: string;
  copy: string;
  copy_por_red?: Partial<Record<Red, string>>;
  source_url?: string;
  alcance?: PostAlcance;
  redes_destino: Red[];
  estado: EstadoPost;
  fecha_programada?: string;
  fecha_publicacion?: string;
  tracking_slug: string;
  created_at: string;
  /** Hashtags de nicho por red (generados por IA). */
  hashtags_por_red?: Partial<Record<Red, string[]>>;
  /** Top hashtags virales para el producto/servicio. */
  hashtags_virales?: string[];
  /** Canales y grupos donde la IA distribuirá el contenido. */
  canales_distribucion?: CanalDistribucion[];
  nicho_label?: string;
  total_canales?: number;
  /** Último envío masivo por WhatsApp CRM. */
  whatsapp_enviado_at?: string;
  whatsapp_broadcast_count?: number;
  schedule_meta?: ScheduleMeta;
}

export interface PostMetric {
  id: string;
  post_id: string;
  red: Red;
  vistas: number;
  likes: number;
  comentarios: number;
  compartidos: number;
  seguidores_ganados: number;
  mensajes_generados: number;
}

export interface WaContact {
  id: string;
  user_id: string;
  nombre: string;
  celular: string;
  etiqueta: string;
  etapa: EtapaLead;
  origen: string;
  post_origen_id?: string;
  campaign_id?: string;
  notas: string;
  monto_venta?: number;
  fecha_creacion: string;
  no_leidos: number;
  lead_score?: number;
  score_motivos?: string[];
}

export interface WaMessage {
  id: string;
  contact_id: string;
  direccion: "entrante" | "saliente";
  texto: string;
  automatico: boolean;
  /** Publicación relacionada (broadcast o consulta). */
  post_id?: string;
  timestamp: string;
  tipo_media?: "audio";
  duracion_seg?: number;
  audio_url?: string;
  transcripcion?: string;
}

export interface AutomationRule {
  id: string;
  user_id: string;
  nombre: string;
  disparador: "mensaje_nuevo" | "palabra_clave" | "fuera_de_horario";
  palabra_clave?: string;
  respuesta: string;
  activa: boolean;
}

export interface MediaAsset {
  id: string;
  user_id: string;
  nombre: string;
  url: string;
  tipo: "imagen" | "video";
  tags: string[];
  created_at: string;
}

export interface InboxItem {
  id: string;
  user_id: string;
  red: Red;
  tipo: "comentario" | "dm";
  autor: string;
  avatar: string;
  texto: string;
  post_ref?: string;
  leido: boolean;
  respondido: boolean;
  respuesta?: string;
  timestamp: string;
}

export interface Producto {
  id: string;
  user_id: string;
  nombre: string;
  precio: number;
  moneda: "MXN" | "COP" | "ARS" | "CLP" | "USD";
  descripcion: string;
  imagen: string;
  link_pago: string;
  pago_provider?: PagoProvider;
  slug_publico?: string;
  activo: boolean;
}

export interface MarketplaceReceta {
  id: string;
  autor_id: string;
  autor_nombre: string;
  titulo: string;
  industria: string;
  emoji: string;
  descripcion: string;
  precio: number;
  descargas: number;
  rating: number;
  votos?: number;
  publicada: string;
}

export type AdObjetivo = "mensajes_whatsapp" | "trafico_catalogo" | "ventas_link";
export type AdEstado = "activa" | "pausada" | "finalizada" | "borrador";
export type AdTipo = "search" | "performance_max" | "display";

export interface AdCampaign {
  id: string;
  user_id: string;
  nombre: string;
  objetivo: AdObjetivo;
  tipo: AdTipo;
  estado: AdEstado;
  presupuesto_diario: number;
  moneda: "MXN" | "COP" | "ARS" | "CLP" | "USD";
  paises: string[];
  ciudades: string[];
  edad_min: number;
  edad_max: number;
  intereses: string[];
  keywords: string[];
  headline: string;
  descripcion: string;
  cta: string;
  post_id?: string;
  tracking_slug: string;
  fecha_inicio: string;
  fecha_fin?: string;
  created_at: string;
}

export interface AdMetric {
  id: string;
  campaign_id: string;
  fecha: string;
  impresiones: number;
  clics: number;
  gasto: number;
  conversiones: number;
  ventas_atribuidas: number;
  monto_atribuido: number;
}

export interface ABExperiment {
  id: string;
  user_id: string;
  nombre: string;
  variante_a_post_id: string;
  variante_b_post_id: string;
  metric: "vistas" | "mensajes_generados" | "engagement";
  inicio: string;
  fin_estimado: string; // 24h después
  ganador?: "A" | "B" | "empate";
  estado: "corriendo" | "finalizado";
}

export interface DB {
  profiles: Profile[];
  social_accounts: SocialAccount[];
  posts: Post[];
  post_metrics: PostMetric[];
  whatsapp_contacts: WaContact[];
  whatsapp_messages: WaMessage[];
  automation_rules: AutomationRule[];
  media_assets: MediaAsset[];
  inbox: InboxItem[];
  productos: Producto[];
  ad_campaigns: AdCampaign[];
  ad_metrics: AdMetric[];
  marketplace_recetas: MarketplaceReceta[];
  ab_experiments?: ABExperiment[];
  session_user_id: string | null;
}

export const PLAN_LIMITS: Record<Plan, { redes: number; posts_mes: number; conversaciones: number; reglas: number; productos: number; campañas: number }> = {
  free: { redes: 1, posts_mes: 10, conversaciones: 50, reglas: 2, productos: 5, campañas: 1 },
  pro: { redes: 4, posts_mes: 999, conversaciones: 500, reglas: 10, productos: 50, campañas: 10 },
  business: { redes: 4, posts_mes: 9999, conversaciones: 9999, reglas: 99, productos: 999, campañas: 99 },
};
