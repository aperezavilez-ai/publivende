import type { Red } from "@/lib/mock/types";
import { resolveNicho } from "./inferNiche";

const POOLS: Record<string, Partial<Record<Red, string[]>>> = {
  moda: {
    instagram: ["#ModaLATAM", "#OOTD", "#EmprendedorasMX", "#VentaPorDM", "#ModaMexico", "#OutfitDelDia", "#Tendencia2025", "#BoutiqueOnline", "#EnviosNacionales", "#Lookbook", "#ModaFemenina", "#StyleInspo", "#ComprasOnline", "#FashionLATAM", "#EmprendeConEstilo"],
    facebook: ["#ModaMexico", "#Emprendedoras", "#VentaOnline", "#EnviosNacionales", "#ModaLATAM"],
    tiktok: ["#fyp", "#moda", "#outfit", "#smallbusiness", "#latam", "#fashiontok", "#ootd", "#viral"],
    youtube: ["moda latam", "outfit ideas", "emprendimiento moda", "venta online mexico", "lookbook"],
  },
  ropa: {
    instagram: ["#RopaMujer", "#ModaLATAM", "#TiendaOnline", "#NuevaColeccion", "#PromoModa", "#EnvioGratis", "#Emprende", "#VentaPorWhatsApp", "#OutfitInspo", "#ModaCasual", "#Tendencias", "#Boutique", "#ComprasMX", "#StyleTips", "#FashionDeals"],
    facebook: ["#RopaOnline", "#ModaMexico", "#Promociones", "#Emprendedores", "#EnviosATodoMexico"],
    tiktok: ["#fyp", "#ropa", "#moda", "#outfit", "#smallbusiness", "#latam", "#fashionhaul", "#viral"],
    youtube: ["ropa mujer", "moda latina", "haul ropa", "tienda online", "outfit ideas"],
  },
  belleza: {
    instagram: ["#BellezaLATAM", "#Skincare", "#Maquillaje", "#BeautyTips", "#GlowUp", "#EmprendeBelleza", "#SalonDeBelleza", "#CuidadoPersonal", "#MakeupTutorial", "#BeautyMexico", "#SelfCare", "#BellezaNatural", "#NailsArt", "#HairGoals", "#BeautyBiz"],
    facebook: ["#Belleza", "#Salon", "#CuidadoPersonal", "#Emprendedoras", "#BeautyMexico"],
    tiktok: ["#fyp", "#beauty", "#skincare", "#makeup", "#beautytok", "#glowup", "#latam", "#viral"],
    youtube: ["belleza latam", "skincare rutina", "maquillaje tutorial", "salon belleza", "tips belleza"],
  },
  comida: {
    instagram: ["#ComidaLATAM", "#Foodie", "#Delivery", "#MenuDelDia", "#ComidaCasera", "#RestauranteLocal", "#FoodPorn", "#RecetasFaciles", "#EmprendeComida", "#Antojitos", "#ComidaMexicana", "#ChefEnCasa", "#PedidosOnline", "#FoodLover", "#PlatilloDelDia"],
    facebook: ["#Comida", "#Restaurante", "#Delivery", "#MenuDelDia", "#ComidaLocal"],
    tiktok: ["#fyp", "#food", "#foodtok", "#recetas", "#comida", "#latam", "#viral", "#antojitos"],
    youtube: ["comida latam", "recetas faciles", "restaurante local", "food delivery", "menu del dia"],
  },
  fitness: {
    instagram: ["#FitnessLATAM", "#GymLife", "#Entrenamiento", "#Salud", "#Wellness", "#FitMotivation", "#GymTok", "#VidaSaludable", "#PersonalTrainer", "#FitnessMexico", "#Workout", "#GymMotivation", "#FitLife", "#HealthTips", "#Transformacion"],
    facebook: ["#Fitness", "#Gym", "#Salud", "#Entrenamiento", "#VidaSaludable"],
    tiktok: ["#fyp", "#fitness", "#gym", "#workout", "#fitnessmotivation", "#latam", "#viral"],
    youtube: ["fitness latam", "rutina gym", "entrenamiento casa", "vida saludable", "motivacion fitness"],
  },
  tecnologia: {
    instagram: ["#TechLATAM", "#IA", "#Startup", "#EmprendeTech", "#SaaS", "#MarketingDigital", "#Innovacion", "#ProductLaunch", "#Software", "#Automatizacion", "#NegociosDigitales", "#CreadoresTech", "#Growth", "#Emprendimiento", "#DigitalFirst"],
    facebook: ["#Tecnologia", "#Emprendimiento", "#MarketingDigital", "#Innovacion", "#LATAM"],
    tiktok: ["#fyp", "#tech", "#ia", "#startup", "#emprende", "#saas", "#latam", "#viral"],
    youtube: ["tecnologia latam", "inteligencia artificial", "lanzamiento producto", "marketing digital", "emprendimiento tech"],
  },
  servicios: {
    instagram: ["#ServiciosProfesionales", "#Consultoria", "#Emprende", "#NegocioLocal", "#LATAM", "#Pymes", "#Asesoria", "#Agencia", "#B2B", "#ClientesFelices", "#VentasB2B", "#Expertos", "#Soluciones", "#Crecimiento", "#MarcaPersonal"],
    facebook: ["#Servicios", "#Consultoria", "#Emprendimiento", "#NegocioLocal", "#LATAM"],
    tiktok: ["#fyp", "#servicios", "#consultoria", "#emprende", "#negocios", "#latam", "#tips", "#viral"],
    youtube: ["servicios profesionales", "consultoria latam", "emprendimiento servicios", "negocio local", "ventas b2b"],
  },
  default: {
    instagram: ["#LATAM", "#Emprende", "#Pymes", "#VenderEnLinea", "#Creadores", "#MarketingDigital", "#NegocioOnline", "#WhatsAppBusiness", "#Emprendedoras", "#Viral", "#ContenidoDigital", "#RedesSociales", "#GrowthHacking", "#VentasOnline", "#SmallBusiness"],
    facebook: ["#Emprendimiento", "#NegocioLocal", "#VentasOnline", "#LATAM", "#Pymes"],
    tiktok: ["#fyp", "#emprende", "#smallbusiness", "#latam", "#viral", "#negocios", "#tips"],
    youtube: ["emprendimiento latam", "negocio online", "marketing digital", "ventas whatsapp", "pymes mexico"],
  },
};

export function getNicheHashtags(industria: string, red: Red, limit?: number, contentText = ""): string[] {
  const key = resolveNicho([contentText], industria);
  const pool = POOLS[key]?.[red] ?? POOLS.default[red] ?? [];
  const max = limit ?? (red === "instagram" ? 20 : red === "tiktok" ? 8 : red === "facebook" ? 5 : 10);
  return pool.slice(0, max);
}
