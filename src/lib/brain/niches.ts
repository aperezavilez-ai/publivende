import type { Red, TipoPost } from "@/lib/mock/types";

export type NicheKey =
  | "ropa"
  | "belleza"
  | "comida"
  | "salon"
  | "inmobiliaria"
  | "infoproductos"
  | "fitness"
  | "servicios"
  | "general";

export interface HookFormula {
  /** Nombre corto de la fórmula, para que el cliente aprenda el patrón. */
  formula: string;
  /** Plantilla con {producto}, {ciudad}, {publico}, {negocio}, {precio}. */
  plantilla: string;
  por_que: string;
}

export interface Objecion {
  objecion: string;
  respuesta: string;
}

export interface NicheProfile {
  key: NicheKey;
  label: string;
  /** Palabras para reconocer el nicho cuando la industria es texto libre. */
  match: string[];
  /** Publicaciones por semana recomendadas como referencia general del nicho. */
  frecuencia_semanal: number;
  /** Proporción mínima de video recomendada. */
  video_min: number;
  formato_estrella: TipoPost;
  redes_prioritarias: Red[];
  pilares: string[];
  horarios: Array<{ dia: string; hora: string }>;
  hooks: HookFormula[];
  objeciones: Objecion[];
  cta_tipico: string;
}

const COMMON_HOOKS: HookFormula[] = [
  {
    formula: "Error común",
    plantilla: "El error que casi todos cometen al elegir {producto} (y cómo evitarlo)",
    por_que: "Activa el miedo a equivocarse y promete una solución rápida.",
  },
  {
    formula: "Pregunta directa",
    plantilla: "¿Sigues buscando {producto} en {ciudad}? Mira esto antes de comprar",
    por_que: "Filtra a quien ya tiene la necesidad y lo detiene en el scroll.",
  },
  {
    formula: "Número concreto",
    plantilla: "3 razones por las que nuestros clientes vuelven por {producto}",
    por_que: "Los números prometen algo corto y fácil de consumir.",
  },
];

export const NICHES: Record<NicheKey, NicheProfile> = {
  ropa: {
    key: "ropa",
    label: "Ropa y moda",
    match: [
      "ropa",
      "moda",
      "boutique",
      "calzado",
      "zapato",
      "tenis",
      "accesorio",
      "joyer",
      "bolsa",
      "lencer",
    ],
    frecuencia_semanal: 6,
    video_min: 0.5,
    formato_estrella: "video",
    redes_prioritarias: ["instagram", "tiktok", "facebook"],
    pilares: [
      "Outfits armados con una prenda (3 formas de usarla)",
      "Prueba en cuerpo real / tallas",
      "Llegó mercancía nueva (unboxing de la paca o pedido)",
      "Clientes usando sus prendas (prueba social)",
      "Últimas piezas y apartados",
    ],
    horarios: [
      { dia: "Martes", hora: "8:00 PM" },
      { dia: "Jueves", hora: "8:30 PM" },
      { dia: "Sábado", hora: "11:00 AM" },
      { dia: "Domingo", hora: "7:00 PM" },
    ],
    hooks: [
      {
        formula: "Una prenda, tres looks",
        plantilla: "1 {producto}, 3 outfits para toda la semana 👀",
        por_que: "Muestra valor por el precio y hace que la gente guarde el video.",
      },
      {
        formula: "Talla real",
        plantilla: "Así le queda {producto} a una talla real (sin filtros)",
        por_que: "Resuelve la objeción número uno de comprar ropa por internet: la talla.",
      },
      {
        formula: "Escasez",
        plantilla: "Solo quedan pocas piezas de {producto}… y no vamos a resurtir",
        por_que: "La escasez real acelera la decisión de compra.",
      },
      {
        formula: "Antes y después",
        plantilla: "De outfit aburrido a outfit de salida con solo {producto}",
        por_que: "La transformación visual es el formato que más retiene en moda.",
      },
      ...COMMON_HOOKS,
    ],
    objeciones: [
      {
        objecion: "¿Y si no me queda?",
        respuesta: "Ofrece guía de tallas con medidas y cambio de talla sin costo.",
      },
      {
        objecion: "¿Es original / de buena calidad?",
        respuesta: "Muestra la tela de cerca en video y reseñas de clientas.",
      },
      {
        objecion: "El envío sale caro",
        respuesta: "Ofrece envío gratis a partir de cierto monto o entrega en punto medio.",
      },
    ],
    cta_tipico: "Escríbenos por WhatsApp con tu talla y te lo apartamos",
  },
  belleza: {
    key: "belleza",
    label: "Belleza y cosmética",
    match: [
      "belleza",
      "cosmet",
      "maquillaje",
      "skincare",
      "uñas",
      "unas",
      "pestañas",
      "spa",
      "estetica",
      "estética",
      "perfum",
    ],
    frecuencia_semanal: 5,
    video_min: 0.6,
    formato_estrella: "video",
    redes_prioritarias: ["instagram", "tiktok", "facebook"],
    pilares: [
      "Tutorial corto de aplicación",
      "Antes y después real",
      "Rutina paso a paso",
      "Mitos y verdades del cuidado de la piel",
      "Reseñas de clientas",
    ],
    horarios: [
      { dia: "Lunes", hora: "9:00 PM" },
      { dia: "Miércoles", hora: "8:00 PM" },
      { dia: "Viernes", hora: "1:00 PM" },
      { dia: "Domingo", hora: "8:00 PM" },
    ],
    hooks: [
      {
        formula: "Antes y después",
        plantilla: "Antes y después de usar {producto} durante 7 días",
        por_que: "La prueba visual es lo que más convence en belleza.",
      },
      {
        formula: "Mito",
        plantilla: "Deja de hacer esto si quieres que {producto} sí funcione",
        por_que: "Corregir un hábito genera curiosidad y autoridad.",
      },
      {
        formula: "Rutina en segundos",
        plantilla: "Mi rutina de 30 segundos con {producto} para verte descansada",
        por_que: "Promete resultado con poco esfuerzo.",
      },
      {
        formula: "Pregunta de dolor",
        plantilla: "¿Piel grasa, manchas o poros abiertos? Esto es para ti",
        por_que: "Nombrar el problema exacto hace que la persona se sienta identificada.",
      },
      ...COMMON_HOOKS,
    ],
    objeciones: [
      {
        objecion: "¿Funciona para mi tipo de piel?",
        respuesta: "Pregunta su tipo de piel y recomienda la opción adecuada.",
      },
      { objecion: "¿Es original?", respuesta: "Muestra empaque, lote y factura del distribuidor." },
      { objecion: "Está caro", respuesta: "Calcula el costo por uso o por día de rendimiento." },
    ],
    cta_tipico: "Mándanos tu tipo de piel por WhatsApp y te armamos tu rutina",
  },
  comida: {
    key: "comida",
    label: "Comida y delivery",
    match: [
      "comida",
      "restaurante",
      "restaurant",
      "delivery",
      "taco",
      "pizza",
      "hamburguesa",
      "postre",
      "pastel",
      "cafe",
      "café",
      "panader",
      "cocina",
      "antojito",
      "sushi",
      "mariscos",
    ],
    frecuencia_semanal: 7,
    video_min: 0.5,
    formato_estrella: "video",
    redes_prioritarias: ["facebook", "instagram", "tiktok"],
    pilares: [
      "Preparación en cocina (proceso que antoja)",
      "Promo del día / combo",
      "Clientes disfrutando el platillo",
      "Detrás de cámaras: ingredientes frescos",
      "Menú de fin de semana",
    ],
    horarios: [
      { dia: "Lunes a viernes", hora: "12:00 PM" },
      { dia: "Lunes a viernes", hora: "6:30 PM" },
      { dia: "Sábado", hora: "1:00 PM" },
      { dia: "Domingo", hora: "11:00 AM" },
    ],
    hooks: [
      {
        formula: "Antojo inmediato",
        plantilla: "Si ves esto con hambre, ya perdiste 🤤 {producto}",
        por_que: "El video del platillo en primer segundo detiene el scroll a la hora de comer.",
      },
      {
        formula: "Proceso",
        plantilla: "Así preparamos {producto} desde cero, todos los días",
        por_que: "El proceso genera confianza en la frescura y calidad.",
      },
      {
        formula: "Precio sorpresa",
        plantilla: "{producto} por solo ${precio} en {ciudad}… y te lo llevamos",
        por_que: "Precio claro + entrega elimina la fricción de pedir.",
      },
      {
        formula: "Reto",
        plantilla: "¿Te terminas {producto} tú solo? Te reto",
        por_que: "Los retos generan comentarios y etiquetas a amigos.",
      },
      ...COMMON_HOOKS,
    ],
    objeciones: [
      {
        objecion: "¿Cuánto tarda en llegar?",
        respuesta: "Da un tiempo concreto por zona y confirma al enviar.",
      },
      { objecion: "¿Llegan a mi colonia?", respuesta: "Publica tu zona de entrega con mapa." },
      {
        objecion: "¿Cuál me recomiendas?",
        respuesta: "Ten un 'más pedido' y un combo para indecisos.",
      },
    ],
    cta_tipico: "Pide por WhatsApp y te lo llevamos caliente",
  },
  salon: {
    key: "salon",
    label: "Salón / barbería",
    match: ["salon", "salón", "barber", "peluquer", "estilista", "corte", "tinte", "cabello"],
    frecuencia_semanal: 5,
    video_min: 0.6,
    formato_estrella: "video",
    redes_prioritarias: ["instagram", "tiktok", "facebook"],
    pilares: [
      "Transformaciones antes y después",
      "Tendencias de corte o color de la temporada",
      "Cuidados en casa",
      "Agenda disponible de la semana",
      "Conoce al equipo",
    ],
    horarios: [
      { dia: "Martes", hora: "7:00 PM" },
      { dia: "Jueves", hora: "1:00 PM" },
      { dia: "Viernes", hora: "8:00 PM" },
      { dia: "Domingo", hora: "6:00 PM" },
    ],
    hooks: [
      {
        formula: "Transformación",
        plantilla: "Llegó pidiendo un cambio total… mira el resultado",
        por_que: "Las transformaciones son el contenido más compartido en salones.",
      },
      {
        formula: "Tendencia",
        plantilla: "El corte que todos están pidiendo este mes en {ciudad}",
        por_que: "La tendencia local genera deseo y sensación de estar al día.",
      },
      {
        formula: "Agenda limitada",
        plantilla: "Solo me quedan 3 lugares esta semana para {producto}",
        por_que: "La agenda llena transmite demanda y acelera la reserva.",
      },
      {
        formula: "Error en casa",
        plantilla: "Esto le hace daño a tu cabello y lo haces diario",
        por_que: "Corregir un hábito posiciona al estilista como experto.",
      },
      ...COMMON_HOOKS,
    ],
    objeciones: [
      { objecion: "¿Cuánto cuesta?", respuesta: "Publica precios desde y explica qué incluye." },
      {
        objecion: "¿Me va a quedar bien?",
        respuesta: "Ofrece valoración previa por foto en WhatsApp.",
      },
      {
        objecion: "No tengo tiempo",
        respuesta: "Muestra horarios extendidos y duración real del servicio.",
      },
    ],
    cta_tipico: "Agenda tu cita por WhatsApp, quedan pocos lugares",
  },
  inmobiliaria: {
    key: "inmobiliaria",
    label: "Inmobiliaria",
    match: [
      "inmobil",
      "bienes raices",
      "bienes raíces",
      "casa",
      "departamento",
      "terreno",
      "renta",
      "propiedad",
      "real estate",
    ],
    frecuencia_semanal: 4,
    video_min: 0.5,
    formato_estrella: "video",
    redes_prioritarias: ["facebook", "instagram", "youtube"],
    pilares: [
      "Recorrido en video de la propiedad",
      "Cuánto necesitas para comprar (enganche, crédito)",
      "Zona: qué hay cerca",
      "Propiedades vendidas / clientes entregados",
      "Errores al comprar o rentar",
    ],
    horarios: [
      { dia: "Martes", hora: "8:00 PM" },
      { dia: "Jueves", hora: "8:00 PM" },
      { dia: "Sábado", hora: "10:00 AM" },
      { dia: "Domingo", hora: "11:00 AM" },
    ],
    hooks: [
      {
        formula: "Precio + zona",
        plantilla: "Así se ve una casa de ${precio} en {ciudad} 🏠",
        por_que: "Precio y ubicación en el primer segundo filtran a compradores reales.",
      },
      {
        formula: "Crédito",
        plantilla: "¿Ganas menos de lo que crees que se necesita? Así puedes comprar con crédito",
        por_que: "Ataca la creencia que frena a la mayoría de compradores.",
      },
      {
        formula: "Recorrido",
        plantilla: "Recorrido completo: {producto} en 60 segundos",
        por_que: "El recorrido ahorra visitas y atrae prospectos calificados.",
      },
      {
        formula: "Error caro",
        plantilla: "El error que te puede costar miles al rentar o comprar en {ciudad}",
        por_que: "El miedo a perder dinero genera mucha atención.",
      },
      ...COMMON_HOOKS,
    ],
    objeciones: [
      {
        objecion: "No tengo enganche",
        respuesta: "Explica opciones de crédito y cofinanciamiento.",
      },
      {
        objecion: "¿La zona es segura?",
        respuesta: "Muestra la zona de día y de noche, y servicios cercanos.",
      },
      {
        objecion: "Lo voy a pensar",
        respuesta: "Ofrece agendar visita sin compromiso esta semana.",
      },
    ],
    cta_tipico: "Escríbenos por WhatsApp para agendar tu visita",
  },
  infoproductos: {
    key: "infoproductos",
    label: "Infoproductos / cursos",
    match: [
      "curso",
      "infoproducto",
      "educa",
      "mentor",
      "coach",
      "taller",
      "clase",
      "academia",
      "capacitac",
      "ebook",
    ],
    frecuencia_semanal: 5,
    video_min: 0.6,
    formato_estrella: "video",
    redes_prioritarias: ["instagram", "tiktok", "youtube"],
    pilares: [
      "Mini lección gratis (valor primero)",
      "Resultados de alumnos",
      "Mitos del tema",
      "Tu historia: por qué enseñas esto",
      "Preguntas frecuentes antes de inscribirse",
    ],
    horarios: [
      { dia: "Lunes", hora: "8:00 PM" },
      { dia: "Miércoles", hora: "7:00 AM" },
      { dia: "Jueves", hora: "9:00 PM" },
      { dia: "Domingo", hora: "6:00 PM" },
    ],
    hooks: [
      {
        formula: "Resultado en tiempo",
        plantilla: "Cómo aprender lo básico de {producto} en 7 días (sin experiencia)",
        por_que: "Promete un resultado concreto en un plazo creíble.",
      },
      {
        formula: "Contraintuitivo",
        plantilla: "Nadie te dice esto sobre {producto}, y por eso no avanzas",
        por_que: "La información 'oculta' genera curiosidad y guardados.",
      },
      {
        formula: "Caso de alumno",
        plantilla: "Mi alumno pasó de cero a su primer resultado en 30 días. Así lo hizo",
        por_que: "La prueba social de alumnos es lo que más vende un curso.",
      },
      {
        formula: "Lista",
        plantilla: "5 errores de principiante en {producto} que te están frenando",
        por_que: "Las listas de errores se guardan y comparten.",
      },
      ...COMMON_HOOKS,
    ],
    objeciones: [
      {
        objecion: "No tengo tiempo",
        respuesta: "Muestra la duración real de las clases y el acceso de por vida.",
      },
      {
        objecion: "¿Funciona para mí?",
        respuesta: "Comparte casos de alumnos con perfil parecido.",
      },
      {
        objecion: "Lo encuentro gratis en YouTube",
        respuesta: "Explica el método paso a paso y el acompañamiento.",
      },
    ],
    cta_tipico: "Escribe 'INFO' por WhatsApp y te mando el temario",
  },
  fitness: {
    key: "fitness",
    label: "Fitness y wellness",
    match: [
      "fitness",
      "gym",
      "gimnasio",
      "entrenador",
      "yoga",
      "pilates",
      "nutri",
      "wellness",
      "crossfit",
      "suplement",
      "dieta",
    ],
    frecuencia_semanal: 6,
    video_min: 0.6,
    formato_estrella: "video",
    redes_prioritarias: ["instagram", "tiktok", "youtube"],
    pilares: [
      "Rutina corta para hacer en casa",
      "Transformaciones de clientes",
      "Mitos de nutrición y ejercicio",
      "Un día en el gimnasio / estudio",
      "Retos de comunidad",
    ],
    horarios: [
      { dia: "Lunes", hora: "6:00 AM" },
      { dia: "Martes", hora: "7:00 PM" },
      { dia: "Jueves", hora: "6:00 AM" },
      { dia: "Domingo", hora: "7:00 PM" },
    ],
    hooks: [
      {
        formula: "Reto corto",
        plantilla: "Haz esto 10 minutos al día durante 2 semanas y nota la diferencia",
        por_que: "Un reto concreto y corto invita a guardar y probar.",
      },
      {
        formula: "Mito",
        plantilla: "Hacer abdominales NO te va a quitar la panza. Haz esto",
        por_que: "Romper una creencia popular genera debate y comentarios.",
      },
      {
        formula: "Transformación",
        plantilla: "Así cambió en 90 días con {producto}, sin dietas extremas",
        por_que: "El antes y después con método realista vende planes y membresías.",
      },
      {
        formula: "Identificación",
        plantilla: "Si siempre empiezas el lunes y lo dejas el miércoles, esto es para ti",
        por_que: "Describe un comportamiento con el que muchos se identifican.",
      },
      ...COMMON_HOOKS,
    ],
    objeciones: [
      {
        objecion: "No tengo tiempo",
        respuesta: "Ofrece rutinas de 20 minutos y horarios flexibles.",
      },
      {
        objecion: "Ya lo intenté y no funcionó",
        respuesta: "Explica el acompañamiento y seguimiento semanal.",
      },
      { objecion: "Está caro", respuesta: "Compara con el costo diario y ofrece clase de prueba." },
    ],
    cta_tipico: "Escríbenos 'PRUEBA' por WhatsApp y agenda tu clase gratis",
  },
  servicios: {
    key: "servicios",
    label: "Servicios profesionales",
    match: [
      "servicio",
      "consultor",
      "abogad",
      "contador",
      "contab",
      "dentist",
      "medic",
      "taller",
      "reparac",
      "plomer",
      "electric",
      "limpieza",
      "fotograf",
      "diseño",
      "marketing",
      "seguro",
      "agencia",
    ],
    frecuencia_semanal: 3,
    video_min: 0.35,
    formato_estrella: "video",
    redes_prioritarias: ["facebook", "instagram", "youtube"],
    pilares: [
      "Caso resuelto (problema → solución → resultado)",
      "Preguntas frecuentes respondidas",
      "Señales de que necesitas el servicio",
      "Detrás de cámaras del trabajo",
      "Testimonios de clientes",
    ],
    horarios: [
      { dia: "Martes", hora: "9:00 AM" },
      { dia: "Miércoles", hora: "1:00 PM" },
      { dia: "Jueves", hora: "8:00 PM" },
    ],
    hooks: [
      {
        formula: "Señales",
        plantilla: "3 señales de que necesitas {producto} antes de que sea tarde",
        por_que: "Ayuda al cliente a reconocer su problema y actuar.",
      },
      {
        formula: "Caso real",
        plantilla: "Un cliente llegó con este problema. Así lo resolvimos en {ciudad}",
        por_que: "El caso real demuestra experiencia sin sonar a anuncio.",
      },
      {
        formula: "Costo de no actuar",
        plantilla: "Lo que te cuesta NO resolver esto a tiempo",
        por_que: "Cuantificar la pérdida motiva más que describir el beneficio.",
      },
      {
        formula: "Pregunta frecuente",
        plantilla: "¿Cuánto cuesta {producto}? Te lo explico sin rodeos",
        por_que: "La transparencia en precio genera confianza y mensajes calificados.",
      },
      ...COMMON_HOOKS,
    ],
    objeciones: [
      {
        objecion: "¿Cuánto cuesta?",
        respuesta: "Da un rango y ofrece cotización gratis por WhatsApp.",
      },
      { objecion: "¿Son confiables?", respuesta: "Muestra casos, reseñas y certificaciones." },
      { objecion: "Lo hago yo mismo", respuesta: "Explica los riesgos y el tiempo que se ahorra." },
    ],
    cta_tipico: "Pide tu cotización gratis por WhatsApp",
  },
  general: {
    key: "general",
    label: "Negocio local",
    match: [],
    frecuencia_semanal: 4,
    video_min: 0.4,
    formato_estrella: "video",
    redes_prioritarias: ["facebook", "instagram", "tiktok"],
    pilares: [
      "Producto estrella explicado",
      "Clientes satisfechos",
      "Detrás de cámaras",
      "Promoción de la semana",
      "Preguntas frecuentes",
    ],
    horarios: [
      { dia: "Martes", hora: "8:00 PM" },
      { dia: "Jueves", hora: "1:00 PM" },
      { dia: "Sábado", hora: "11:00 AM" },
    ],
    hooks: [
      {
        formula: "Beneficio directo",
        plantilla: "Esto es lo que {producto} puede hacer por ti en {ciudad}",
        por_que: "Ve directo al beneficio para el cliente.",
      },
      {
        formula: "Detrás de cámaras",
        plantilla: "Lo que nadie ve de {negocio} (y por qué nuestros clientes regresan)",
        por_que: "La transparencia humaniza la marca y genera confianza.",
      },
      ...COMMON_HOOKS,
    ],
    objeciones: [
      { objecion: "Está caro", respuesta: "Explica qué incluye y compara con la alternativa." },
      { objecion: "Lo voy a pensar", respuesta: "Ofrece un beneficio por decidir hoy." },
    ],
    cta_tipico: "Escríbenos por WhatsApp",
  },
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function resolveNiche(industria?: string | null): NicheProfile {
  if (!industria) return NICHES.general;
  const text = normalize(industria);
  for (const niche of Object.values(NICHES)) {
    if (normalize(niche.label) === text) return niche;
  }
  for (const niche of Object.values(NICHES)) {
    if (niche.match.some((m) => text.includes(normalize(m)))) return niche;
  }
  return NICHES.general;
}

export function fillHook(
  plantilla: string,
  vars: { producto?: string; ciudad?: string; publico?: string; negocio?: string; precio?: number },
): string {
  return plantilla
    .replace(/\{producto\}/g, vars.producto || "nuestro producto")
    .replace(/\{ciudad\}/g, vars.ciudad || "tu ciudad")
    .replace(/\{publico\}/g, vars.publico || "ti")
    .replace(/\{negocio\}/g, vars.negocio || "nuestro negocio")
    .replace(/\{precio\}/g, vars.precio ? vars.precio.toLocaleString("es-MX") : "un gran precio");
}

export interface SeasonEvent {
  nombre: string;
  fecha: Date;
  /** Días de anticipación recomendados para empezar a publicar. */
  preparar_dias: number;
  angulo: string;
  nichos?: NicheKey[];
}

function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const d = new Date(year, month, 1);
  const offset = (weekday - d.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

function seasonsForYear(y: number): SeasonEvent[] {
  return [
    {
      nombre: "Día de Reyes",
      fecha: new Date(y, 0, 6),
      preparar_dias: 14,
      angulo: "Regalos y roscas; promociones para niños.",
      nichos: ["comida", "ropa", "general"],
    },
    {
      nombre: "Cuesta de enero",
      fecha: new Date(y, 0, 15),
      preparar_dias: 7,
      angulo: "Precios accesibles, pagos en partes, propósitos de año nuevo.",
      nichos: ["fitness", "infoproductos", "servicios", "general"],
    },
    {
      nombre: "San Valentín",
      fecha: new Date(y, 1, 14),
      preparar_dias: 21,
      angulo: "Regalos en pareja y entre amigos, paquetes especiales.",
    },
    {
      nombre: "Día del Niño",
      fecha: new Date(y, 3, 30),
      preparar_dias: 14,
      angulo: "Promociones familiares y regalos.",
      nichos: ["comida", "ropa", "general"],
    },
    {
      nombre: "Día de las Madres",
      fecha: new Date(y, 4, 10),
      preparar_dias: 21,
      angulo: "La fecha comercial más fuerte para regalos en México.",
    },
    {
      nombre: "Hot Sale",
      fecha: new Date(y, 4, 27),
      preparar_dias: 10,
      angulo: "Descuentos en línea; anuncia tus ofertas antes que la competencia.",
      nichos: ["ropa", "belleza", "infoproductos", "general"],
    },
    {
      nombre: "Día del Padre",
      fecha: nthWeekday(y, 5, 0, 3),
      preparar_dias: 14,
      angulo: "Regalos y experiencias para papá.",
    },
    {
      nombre: "Verano / vacaciones",
      fecha: new Date(y, 6, 10),
      preparar_dias: 14,
      angulo: "Looks de verano, cuerpo de verano, planes de vacaciones.",
      nichos: ["ropa", "belleza", "fitness", "salon"],
    },
    {
      nombre: "Regreso a clases",
      fecha: new Date(y, 7, 25),
      preparar_dias: 21,
      angulo: "Uniformes, cortes, cursos y organización.",
      nichos: ["ropa", "salon", "infoproductos", "servicios", "general"],
    },
    {
      nombre: "Fiestas Patrias",
      fecha: new Date(y, 8, 15),
      preparar_dias: 14,
      angulo: "Noche mexicana: antojitos, outfits y peinados.",
      nichos: ["comida", "ropa", "salon", "belleza"],
    },
    {
      nombre: "Halloween y Día de Muertos",
      fecha: new Date(y, 9, 31),
      preparar_dias: 21,
      angulo: "Disfraces, maquillaje, pan de muerto y ofrendas.",
      nichos: ["comida", "belleza", "ropa", "salon", "general"],
    },
    {
      nombre: "El Buen Fin",
      fecha: new Date(y, 10, 14),
      preparar_dias: 14,
      angulo: "El fin de semana de descuentos más grande del año; prepara ofertas y apartados.",
    },
    {
      nombre: "Posadas y Navidad",
      fecha: new Date(y, 11, 24),
      preparar_dias: 30,
      angulo: "Regalos, cenas, intercambios y looks de fiesta.",
    },
  ];
}

export function upcomingSeasons(
  niche: NicheKey,
  now = new Date(),
  horizonDays = 75,
): SeasonEvent[] {
  const limit = now.getTime() + horizonDays * 86400000;
  return [...seasonsForYear(now.getFullYear()), ...seasonsForYear(now.getFullYear() + 1)]
    .filter((s) => s.fecha.getTime() >= now.getTime() - 86400000 && s.fecha.getTime() <= limit)
    .filter((s) => !s.nichos || s.nichos.includes(niche))
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

/** Resumen del nicho en texto para darle contexto a la IA. */
export function nicheBrief(industria: string | null | undefined): string {
  const n = resolveNiche(industria);
  const temporadas = upcomingSeasons(n.key)
    .map((s) => `${s.nombre} (${s.fecha.toISOString().slice(0, 10)}): ${s.angulo}`)
    .join("; ");
  return [
    `Nicho: ${n.label}`,
    `Frecuencia de referencia: ${n.frecuencia_semanal} publicaciones/semana; video mínimo ${Math.round(n.video_min * 100)}%`,
    `Redes prioritarias: ${n.redes_prioritarias.join(", ")}`,
    `Pilares de contenido: ${n.pilares.join(" | ")}`,
    `Fórmulas de ganchos probadas: ${n.hooks.map((h) => `${h.formula} → "${h.plantilla}"`).join(" | ")}`,
    `Objeciones típicas: ${n.objeciones.map((o) => `${o.objecion} (${o.respuesta})`).join(" | ")}`,
    `CTA típico: ${n.cta_tipico}`,
    temporadas ? `Fechas comerciales próximas: ${temporadas}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
