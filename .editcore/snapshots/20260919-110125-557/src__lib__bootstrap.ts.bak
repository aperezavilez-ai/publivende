import { loadDB, saveDB, uid, slug } from "@/lib/mock/db";
import type { PagoProvider, Profile } from "@/lib/mock/types";
import { generarLinkCobro } from "@/lib/payments";

export interface OnboardingProductInput {
  nombre: string;
  precio: number;
  descripcion: string;
  imagen?: string;
  tipo?: "producto" | "servicio";
  copy_publicacion?: string;
  generado_ia?: boolean;
  importado_de?: string;
}

export interface OnboardingBootstrapInput {
  industria: string;
  descripcion_negocio: string;
  publico_objetivo: string;
  tono_marca: string;
  ciudad: string;
  horario_atencion: string;
  pago_provider: PagoProvider;
  productos: OnboardingProductInput[];
  regla_bienvenida: string;
  regla_precio: string;
  palabra_clave_precio: string;
  regla_fuera_horario: string;
}

const DEFAULT_IMG = "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800";

function buildListaPrecios(productos: OnboardingProductInput[]): string {
  if (!productos.length) return "Consulta disponibilidad con nosotros.";
  return productos.map((p) => `• ${p.nombre}: $${p.precio} MXN`).join("\n");
}

/**
 * Convierte la info del onboarding en la base de datos del cliente:
 * perfil enriquecido, catálogo, reglas CRM/IA y borrador de primer post.
 */
export function bootstrapClientFromOnboarding(userId: string, input: OnboardingBootstrapInput) {
  const db = loadDB();
  const profile = db.profiles.find((p) => p.id === userId);
  if (!profile) return;

  const listaPrecios = buildListaPrecios(input.productos);

  // Reemplazar catálogo, borradores y reglas previas del onboarding
  db.productos = db.productos.filter((p) => p.user_id !== userId);
  db.posts = db.posts.filter((p) => !(p.user_id === userId && p.estado === "borrador"));
  db.media_assets = db.media_assets.filter((m) => m.user_id !== userId);
  db.automation_rules = db.automation_rules.filter((r) => r.user_id !== userId);

  Object.assign(profile, {
    industria: input.industria,
    descripcion_negocio: input.descripcion_negocio,
    publico_objetivo: input.publico_objetivo,
    tono_marca: input.tono_marca,
    ciudad: input.ciudad,
    horario_atencion: input.horario_atencion,
    pago_provider_default: input.pago_provider,
  } satisfies Partial<Profile>);

  // Catálogo real del negocio (alimenta CRM → Enviar producto, IA, cobros)
  input.productos.forEach((p) => {
    const img = p.imagen || DEFAULT_IMG;
    const cobro = generarLinkCobro({
      provider: input.pago_provider,
      monto: p.precio > 0 ? p.precio : 1,
      moneda: "MXN",
      descripcion: p.nombre,
    });
    db.productos.push({
      id: uid(),
      user_id: userId,
      nombre: p.nombre,
      precio: p.precio,
      moneda: "MXN",
      descripcion: p.descripcion || input.descripcion_negocio,
      imagen: img,
      link_pago: cobro.url,
      pago_provider: input.pago_provider,
      slug_publico: slug() + "-" + p.nombre.toLowerCase().replace(/\s+/g, "-"),
      activo: true,
    });
    db.media_assets.push({
      id: uid(),
      user_id: userId,
      nombre: p.nombre,
      url: img,
      tipo: "imagen",
      tags: [p.tipo ?? "producto", input.industria, ...(p.generado_ia ? ["generado-ia"] : []), ...(p.importado_de ? ["importado"] : [])],
      created_at: new Date().toISOString(),
    });
  });

  // Borradores de publicación — uno por producto (máx. 4)
  input.productos.slice(0, 4).forEach((p) => {
    const img = p.imagen || DEFAULT_IMG;
    const copy = p.copy_publicacion
      ?? `✨ ${p.nombre} — ${p.descripcion}\n\n💰 $${p.precio} MXN\n📍 ${input.ciudad}\n\nEscríbenos por WhatsApp 👇`;
    db.posts.push({
      id: uid(),
      user_id: userId,
      tipo: "imagen",
      media_url: img,
      copy,
      redes_destino: ["instagram", "facebook"],
      estado: "borrador",
      tracking_slug: slug(),
      created_at: new Date().toISOString(),
    });
  });

  // Reglas que alimentan el CRM automático (WhatsApp entrante → respuesta)
  const reglas = [
    {
      nombre: "Bienvenida",
      disparador: "mensaje_nuevo" as const,
      respuesta: input.regla_bienvenida.replace("{negocio}", profile.nombre_negocio),
      activa: true,
    },
    {
      nombre: "Lista de precios",
      disparador: "palabra_clave" as const,
      palabra_clave: input.palabra_clave_precio || "precio",
      respuesta: `${input.regla_precio.replace("{negocio}", profile.nombre_negocio)}\n\n${listaPrecios}\n\n¿Cuál te interesa? Escríbenos 💜`,
      activa: true,
    },
    {
      nombre: "Fuera de horario",
      disparador: "fuera_de_horario" as const,
      respuesta: input.regla_fuera_horario.replace("{horario}", input.horario_atencion),
      activa: true,
    },
  ];

  reglas.forEach((r) => {
    db.automation_rules.push({
      id: uid(),
      user_id: userId,
      nombre: r.nombre,
      disparador: r.disparador,
      palabra_clave: "palabra_clave" in r ? r.palabra_clave : undefined,
      respuesta: r.respuesta,
      activa: r.activa,
    });
  });

  // CRM vacío al inicio — se llena cuando lleguen mensajes reales de WhatsApp
  saveDB(db);
}

export function getBusinessContext(userId: string): string {
  const db = loadDB();
  const p = db.profiles.find((x) => x.id === userId);
  if (!p) return "";
  const productos = db.productos.filter((x) => x.user_id === userId && x.activo);
  const lines = [
    `Negocio: ${p.nombre_negocio}`,
    `Industria: ${p.industria ?? "general"}`,
    `Descripción: ${p.descripcion_negocio ?? ""}`,
    `Público: ${p.publico_objetivo ?? ""}`,
    `Tono: ${p.tono_marca ?? "casual"}`,
    `Ciudad: ${p.ciudad ?? ""}`,
    `Horario: ${p.horario_atencion ?? ""}`,
    `WhatsApp: ${p.codigo_pais}${p.celular}`,
  ];
  if (productos.length) {
    lines.push("Catálogo:");
    productos.forEach((pr) => lines.push(`- ${pr.nombre}: $${pr.precio} ${pr.moneda} — ${pr.descripcion}`));
  }
  return lines.filter(Boolean).join("\n");
}
