import type { Red } from "@/lib/mock/types";

export interface Receta {
  id: string;
  industria: string;
  emoji: string;
  descripcion: string;
  posts: { copy: string; redes: Red[]; imagen: string }[];
  reglas: { nombre: string; respuesta: string; palabra_clave?: string }[];
  productos: { nombre: string; precio: number }[];
}

const IMG = (s: string) => `https://images.unsplash.com/${s}?w=800`;

export const RECETAS: Receta[] = [
  {
    id: "ropa", industria: "Ropa y moda", emoji: "👗",
    descripcion: "Colección, lookbook, promos y atención por WhatsApp",
    posts: [
      { copy: "Nueva colección otoño 🍂 ¿Cuál te llevas?", redes: ["instagram","facebook"], imagen: IMG("photo-1490481651871-ab68de25d43d") },
      { copy: "Try-on en Reels esta semana 👗", redes: ["instagram","tiktok"], imagen: IMG("photo-1483985988355-763728e1935b") },
      { copy: "Promo 2x1 hasta agotar 🔥", redes: ["instagram","facebook","tiktok"], imagen: IMG("photo-1542838132-92c53300491e") },
      { copy: "Cliente real, reseña real 💜", redes: ["instagram"], imagen: IMG("photo-1556905055-8f358a7a47b2") },
      { copy: "Lo más vendido del mes 🥇", redes: ["facebook","instagram"], imagen: IMG("photo-1542291026-7eec264c27ff") },
    ],
    reglas: [
      { nombre: "Bienvenida moda", respuesta: "¡Hola {nombre}! 💜 Bienvenida a nuestra tienda. ¿Buscas algo en especial?" },
      { nombre: "Tallas", palabra_clave: "talla", respuesta: "Manejamos S, M, L y XL. ¿Qué talla buscas?" },
    ],
    productos: [{ nombre: "Blusa floral", precio: 499 }, { nombre: "Vestido midi", precio: 899 }],
  },
  { id: "belleza", industria: "Belleza y cosmética", emoji: "💄", descripcion: "Tutoriales, productos, agenda y citas",
    posts: [
      { copy: "Tutorial: maquillaje de día en 5 min ✨", redes: ["tiktok","instagram"], imagen: IMG("photo-1522335789203-aabd1fc54bc9") },
      { copy: "Producto estrella del mes 💄", redes: ["instagram","facebook"], imagen: IMG("photo-1556228720-195a672e8a03") },
      { copy: "Antes y después 😱", redes: ["instagram","tiktok"], imagen: IMG("photo-1487412947147-5cebf100ffc2") },
      { copy: "Agenda tu cita por WhatsApp 📅", redes: ["facebook","instagram"], imagen: IMG("photo-1560066984-138dadb4c035") },
      { copy: "Tips para piel sensible 🌿", redes: ["instagram"], imagen: IMG("photo-1571781926291-c477ebfd024b") },
    ],
    reglas: [
      { nombre: "Bienvenida beauty", respuesta: "¡Hola {nombre}! ✨ ¿Buscas un tratamiento o producto?" },
      { nombre: "Agenda cita", palabra_clave: "cita", respuesta: "Claro 💜 ¿Qué día y horario te conviene?" },
    ],
    productos: [{ nombre: "Sérum facial", precio: 650 }, { nombre: "Kit cejas", precio: 350 }],
  },
  { id: "comida", industria: "Comida y delivery", emoji: "🍔", descripcion: "Menú, promos, pedidos por WhatsApp",
    posts: [
      { copy: "Menú del día 🍽️", redes: ["instagram","facebook"], imagen: IMG("photo-1568901346375-23c9450c58cd") },
      { copy: "Promo lunes: 2x1 en hamburguesas 🍔", redes: ["facebook","instagram"], imagen: IMG("photo-1571091718767-18b5b1457add") },
      { copy: "Detrás de la cocina 👨‍🍳", redes: ["tiktok","instagram"], imagen: IMG("photo-1556909114-f6e7ad7d3136") },
      { copy: "Pedidos por WhatsApp 📱", redes: ["facebook"], imagen: IMG("photo-1565299624946-b28f40a0ae38") },
      { copy: "Nuevo postre disponible 🍰", redes: ["instagram"], imagen: IMG("photo-1565958011703-44f9829ba187") },
    ],
    reglas: [
      { nombre: "Bienvenida resto", respuesta: "¡Hola {nombre}! 🍔 ¿Quieres ver nuestro menú?" },
      { nombre: "Envíos", palabra_clave: "envío", respuesta: "Hacemos envíos en zona centro, costo $40. ¿Cuál es tu dirección?" },
    ],
    productos: [{ nombre: "Hamburguesa Clásica", precio: 120 }, { nombre: "Combo Familiar", precio: 380 }],
  },
  { id: "salon", industria: "Salón / barbería", emoji: "💈", descripcion: "Trabajos, agenda y promos",
    posts: [
      { copy: "Corte del día ✂️", redes: ["instagram","tiktok"], imagen: IMG("photo-1503951914875-452162b0f3f1") },
      { copy: "Agenda tu cita por WhatsApp 📅", redes: ["facebook","instagram"], imagen: IMG("photo-1521590832167-7bcbfaa6381f") },
      { copy: "Antes y después 🔥", redes: ["instagram"], imagen: IMG("photo-1599351431202-1e0f0137899a") },
      { copy: "Promo entre semana 💈", redes: ["facebook"], imagen: IMG("photo-1622286342621-4bd786c2447c") },
      { copy: "Nuevo servicio: coloración ✨", redes: ["instagram"], imagen: IMG("photo-1560066984-138dadb4c035") },
    ],
    reglas: [
      { nombre: "Bienvenida salón", respuesta: "¡Hola {nombre}! 💈 ¿Qué servicio te interesa?" },
      { nombre: "Horario", palabra_clave: "horario", respuesta: "Atendemos de martes a domingo, 10am a 8pm." },
    ],
    productos: [{ nombre: "Corte de cabello", precio: 200 }, { nombre: "Color + corte", precio: 800 }],
  },
  { id: "inmobiliaria", industria: "Inmobiliaria", emoji: "🏠", descripcion: "Propiedades, visitas, leads",
    posts: [
      { copy: "Casa nueva en venta 🏡", redes: ["facebook","instagram"], imagen: IMG("photo-1568605114967-8130f3a36994") },
      { copy: "Recorrido virtual disponible 🎥", redes: ["instagram","tiktok"], imagen: IMG("photo-1570129477492-45c003edd2be") },
      { copy: "Tip para comprar tu primera casa 💡", redes: ["instagram","facebook"], imagen: IMG("photo-1582407947304-fd86f028f716") },
      { copy: "Propiedad del mes ⭐", redes: ["facebook"], imagen: IMG("photo-1564013799919-ab600027ffc6") },
      { copy: "Agenda visita por WhatsApp", redes: ["instagram"], imagen: IMG("photo-1580587771525-78b9dba3b914") },
    ],
    reglas: [
      { nombre: "Bienvenida inmob", respuesta: "¡Hola {nombre}! 🏠 ¿Buscas comprar, rentar o vender?" },
      { nombre: "Zonas", palabra_clave: "zona", respuesta: "Tenemos propiedades en varias zonas. ¿Cuál te interesa?" },
    ],
    productos: [{ nombre: "Asesoría inicial", precio: 0 }],
  },
  { id: "infoproductos", industria: "Infoproductos / cursos", emoji: "📚", descripcion: "Educación, leads, ventas digitales",
    posts: [
      { copy: "Aprende algo nuevo hoy 💡", redes: ["instagram","tiktok"], imagen: IMG("photo-1522202176988-66273c2fd55f") },
      { copy: "Testimonio de un alumno 💜", redes: ["instagram","facebook"], imagen: IMG("photo-1573497019940-1c28c88b4f3e") },
      { copy: "Webinar gratuito esta semana 🎓", redes: ["facebook","instagram"], imagen: IMG("photo-1517245386807-bb43f82c33c4") },
      { copy: "3 errores que estás cometiendo", redes: ["tiktok","instagram"], imagen: IMG("photo-1454165804606-c3d57bc86b40") },
      { copy: "Inscripciones abiertas 📝", redes: ["facebook"], imagen: IMG("photo-1513258496099-48168024aec0") },
    ],
    reglas: [
      { nombre: "Bienvenida curso", respuesta: "¡Hola {nombre}! 📚 ¿Quieres info del próximo grupo?" },
      { nombre: "Precio curso", palabra_clave: "precio", respuesta: "El curso completo es $1,990 con pagos en 3 meses sin intereses." },
    ],
    productos: [{ nombre: "Curso básico", precio: 1990 }],
  },
  { id: "fitness", industria: "Fitness y wellness", emoji: "💪", descripcion: "Rutinas, planes, comunidad",
    posts: [
      { copy: "Rutina de 10 min 💪", redes: ["tiktok","instagram"], imagen: IMG("photo-1571019613454-1cb2f99b2d8b") },
      { copy: "Resultado de una alumna 🔥", redes: ["instagram"], imagen: IMG("photo-1518611012118-696072aa579a") },
      { copy: "Tip de nutrición 🥗", redes: ["facebook","instagram"], imagen: IMG("photo-1490645935967-10de6ba17061") },
      { copy: "Reto de 30 días 🏃", redes: ["instagram","tiktok"], imagen: IMG("photo-1517836357463-d25dfeac3438") },
      { copy: "Plan personalizado por WhatsApp", redes: ["facebook"], imagen: IMG("photo-1534438327276-14e5300c3a48") },
    ],
    reglas: [
      { nombre: "Bienvenida fit", respuesta: "¡Hola {nombre}! 💪 ¿Tu objetivo es bajar de peso o ganar masa?" },
    ],
    productos: [{ nombre: "Plan mensual", precio: 599 }],
  },
  { id: "servicios", industria: "Servicios profesionales", emoji: "🛠️", descripcion: "Servicios, cotización, agenda",
    posts: [
      { copy: "Caso de éxito de un cliente 👏", redes: ["facebook","instagram"], imagen: IMG("photo-1556761175-5973dc0f32e7") },
      { copy: "¿Sabías que…? Tip del día", redes: ["instagram"], imagen: IMG("photo-1454165804606-c3d57bc86b40") },
      { copy: "Cotiza por WhatsApp 📲", redes: ["facebook"], imagen: IMG("photo-1521791136064-7986c2920216") },
      { copy: "Equipo trabajando 💼", redes: ["instagram"], imagen: IMG("photo-1552664730-d307ca884978") },
      { copy: "Promo de temporada", redes: ["facebook","instagram"], imagen: IMG("photo-1556745753-b2904692b3cd") },
    ],
    reglas: [
      { nombre: "Bienvenida servicio", respuesta: "¡Hola {nombre}! 🛠️ Cuéntanos qué necesitas y te cotizamos." },
    ],
    productos: [{ nombre: "Consulta inicial", precio: 0 }],
  },
];
