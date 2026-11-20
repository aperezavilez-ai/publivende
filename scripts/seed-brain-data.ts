/**
 * Seed del Banco de Cerebro de PubliVende (market_niches y brain_communities)
 * Carga nichos profundos y comunidades representativas por estado y tipo de alcance.
 */

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNraW1qemZhamFpaGFlcWZndG9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NDUwOCwiZXhwIjoyMDk2ODcwNTA4fQ.aKN4LeFNB1fRsNEQxmKTP7pU00Zqh7DzUAW0YsaddIo';
const SQL_URL = 'https://ckimjzfajaihaeqfgtoj.supabase.co/functions/v1/publivende-sql';

async function query(sql: string, params: any[] = []) {
  const res = await fetch(SQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Error SQL: ${txt}`);
  }
  return res.json();
}

const NICHES = [
  {
    id: 'automotriz',
    nombre: 'Automotriz, Llantas y Mecánica',
    descripcion: 'Venta de llantas, rines, talleres mecánicos, alineación, frenos, autopartes y vulcanizadoras.',
    keywords: [
      'llantas', 'rines', 'alineacion', 'balanceo', 'frenos', 'taller', 'mecanico',
      'amortiguadores', 'suspension', 'vulcanizadora', 'autopartes', 'refacciones',
      'cambio de aceite', 'afinacion', 'bateria', 'parches', 'desponchadora', 'neumaticos'
    ],
    hashtags: ['#LlantasNuevas', '#TallerMecanico', '#Autopartes', '#AlineacionYBalanceo', '#SeguridadVial', '#PromocionesAutos'],
    audiencia_objetivo: 'Conductores, transportistas, dueños de flotillas, autos particulares y talleres.',
    angulo_gancho: 'Seguridad familiar, ahorro garantizado en paquete de 4 llantas, revisión de frenos gratis con tu compra.',
  },
  {
    id: 'belleza_tatuajes',
    nombre: 'Tatuajes, Arte Corporal y Belleza',
    descripcion: 'Estudios de tatuajes, piercings, barberías, salones de belleza, uñas y micropigmentación.',
    keywords: [
      'tatuaje', 'tattoo', 'tatuajes', 'piercing', 'perforaciones', 'flash day', 'tatuador',
      'tinta', 'estudio de tatuajes', 'barberia', 'corte de pelo', 'uñas', 'pestanas',
      'microblading', 'estetica', 'skincare', 'descuento tatuajes', 'buen fin tatuajes'
    ],
    hashtags: ['#TattooArtist', '#TattooLovers', '#ArteCorporal', '#PiercingStyle', '#BuenFinTattoo', '#BarberShop'],
    audiencia_objetivo: 'Jóvenes y adultos de 18 a 45 años, apasionados del arte urbano, estilo personal y estética.',
    angulo_gancho: 'Diseños exclusivos por tiempo limitado, descuentos directos en ruleta o diana, piezas flash a precio especial.',
  },
  {
    id: 'gastronomia',
    nombre: 'Restaurantes, Comida y Bebidas',
    descripcion: 'Taquerías, pizzerías, cafeterías, marisquerías, bares, snacks y postres.',
    keywords: [
      'comida', 'restaurante', 'tacos', 'pizza', 'hamburguesas', 'mariscos', 'antojitos',
      'cafe', 'postres', 'menu del dia', 'promocion comida', 'servicio a domicilio', 'dark kitchen',
      'cerveza', 'buffet', 'desayunos', 'cenas'
    ],
    hashtags: ['#FoodLovers', '#ComidaLocal', '#PromoDelDia', '#TacosLovers', '#RestaurantesMX', '#SaborCasero'],
    audiencia_objetivo: 'Familias, parejas, profesionistas y comensales en horario laboral y fines de semana.',
    angulo_gancho: '2x1 por día especial, bebida de cortesía al ordenar combo, promociones irresistibles para compartir.',
  },
  {
    id: 'hogar_inmuebles',
    nombre: 'Inmuebles, Construcción y Hogar',
    descripcion: 'Bienes raíces, renta y venta de casas, muebles, decoración, plomería, pintura y acabados.',
    keywords: [
      'casa en venta', 'renta', 'inmobiliaria', 'terreno', 'departamento', 'muebles',
      'decoracion', 'pintura', 'plomeria', 'electricista', 'remodelacion', 'acabados',
      'herramientas', 'ferreteria', 'cocinas integrales'
    ],
    hashtags: ['#BienesRaices', '#HogarDulceHogar', '#RentaCasas', '#MueblesModernos', '#Remodelacion', '#TuCasaPropia'],
    audiencia_objetivo: 'Familias, inversionistas, propietarios que remodelan y parejas buscando patrimonio.',
    angulo_gancho: 'Ubicación privilegiada, mensualidades fijas, asesoría de crédito sin costo y descuentos de fábrica.',
  },
  {
    id: 'servicios_profesionales',
    nombre: 'Servicios Profesionales y Negocios',
    descripcion: 'Contadores, abogados, agencias de publicidad, desarrollo web, reparaciones técnicas.',
    keywords: [
      'abogado', 'contador', 'sat', 'facturacion', 'diseño grafico', 'paginas web',
      'marketing digital', 'reparacion computadoras', 'seguridad privada', 'consultoria',
      'capacitacion', 'tramites', 'licencias'
    ],
    hashtags: ['#NegociosExitosos', '#ServiciosProfesionales', '#PymesMexico', '#Emprendedores', '#SolucionesLegales', '#AsesoriaFiscal'],
    audiencia_objetivo: 'Emprendedores, pymes, directores de empresas y personas que requieren trámites confiables.',
    angulo_gancho: 'Diagnóstico o primera consulta gratuita, solución rápida y sin burocracia.',
  },
  {
    id: 'comercio_general',
    nombre: 'Comercio Local y Emprendimiento',
    descripcion: 'Tiendas de ropa, bazares, calzado, accesorios, regalos, ofertas de temporada y comercio en general.',
    keywords: [
      'ropa', 'calzado', 'tenis', 'accesorios', 'bolsas', 'oferta', 'liquidacion',
      'bazar', 'compra venta', 'tienda online', 'envios a todo mexico', 'joyeria',
      'regalos', 'promocion', 'descuento'
    ],
    hashtags: ['#ModaMexico', '#ComercioLocal', '#OfertasIncreibles', '#TiendaOnline', '#HechoEnMexico', '#BazarOnline'],
    audiencia_objetivo: 'Compradores cazadores de ofertas, clientes de comercio electrónico y público general.',
    angulo_gancho: 'Liquidación de inventario con hasta 50% de descuento, envío express y facilidades de pago.',
  },
  {
    id: 'salud_fitness',
    nombre: 'Salud, Gimnasios y Bienestar',
    descripcion: 'Gimnasios, clínicas dentales, nutriólogos, fisioterapia, suplementos y ópticas.',
    keywords: [
      'gimnasio', 'gym', 'fitness', 'nutriologo', 'dentista', 'ortodoncia', 'fisioterapia',
      'suplementos', 'proteina', 'lentes', 'optica', 'psicologo', 'salud visual', 'masajes'
    ],
    hashtags: ['#VidaSaludable', '#FitnessMotivation', '#SaludDental', '#BienestarIntegral', '#CuidadoPersonal'],
    audiencia_objetivo: 'Personas interesadas en salud preventiva, transformación física y cuidado de su salud.',
    angulo_gancho: 'Valoración inicial sin costo, inscripción gratis este mes, paquetes de tratamiento accesibles.',
  },
  {
    id: 'tecnologia_gadgets',
    nombre: 'Tecnología, Celulares y Electrónica',
    descripcion: 'Venta de celulares, laptops, reparación de pantallas, consolas, videojuegos y accesorios.',
    keywords: [
      'celulares', 'iphone', 'samsung', 'reparacion celulares', 'cambio de pantalla', 'laptops',
      'computadoras', 'videojuegos', 'playstation', 'nintendo', 'auriculares', 'smartwatch', 'cargadores'
    ],
    hashtags: ['#Tecnologia', '#Gadgets', '#ReparacionCelulares', '#GamingMX', '#AppleMexico', '#OfertasTech'],
    audiencia_objetivo: 'Gamers, estudiantes, profesionistas que requieren equipos veloces y usuarios de smartphones.',
    angulo_gancho: 'Garantía por escrito de 6 meses, reparación en menos de 1 hora, equipo de reemplazo mientras reparamos.',
  }
];

const COMMUNITIES_TEMPLATE = [
  // Automotriz
  { nicheId: 'automotriz', plataforma: 'facebook_group', nombre: 'Club Automotriz y Venta de Autopartes México', alcance: 'nacional', miembros: 185000, estado: 'General' },
  { nicheId: 'automotriz', plataforma: 'facebook_group', nombre: 'Llantas, Rines y Refacciones Económicas Guadalajara y Jalisco', alcance: 'estatal', miembros: 94000, estado: 'Jalisco' },
  { nicheId: 'automotriz', plataforma: 'facebook_group', nombre: 'Mecánicos y Refaccionarias Monterrey y NL', alcance: 'estatal', miembros: 112000, estado: 'Nuevo León' },
  { nicheId: 'automotriz', plataforma: 'facebook_group', nombre: 'Autopartes y Talleres CDMX y Edomex', alcance: 'estatal', miembros: 240000, estado: 'CDMX' },
  { nicheId: 'automotriz', plataforma: 'facebook_group', nombre: 'Compra y Venta de Autos y Llantas Sinaloa (Culiacán / Mazatlán)', alcance: 'local', miembros: 68000, estado: 'Sinaloa', ciudad: 'Mazatlán' },
  { nicheId: 'automotriz', plataforma: 'whatsapp_channel', nombre: 'Red de Alertas y Ofertas Automotrices PubliVende', alcance: 'nacional', miembros: 45000, estado: 'General' },

  // Tatuajes y Belleza
  { nicheId: 'belleza_tatuajes', plataforma: 'facebook_group', nombre: 'Comunidad del Tatuaje México & Arte Corporal', alcance: 'nacional', miembros: 210000, estado: 'General' },
  { nicheId: 'belleza_tatuajes', plataforma: 'facebook_group', nombre: 'Tattoo & Piercing Lovers Guadalajara / Zapopan', alcance: 'local', miembros: 88000, estado: 'Jalisco', ciudad: 'Guadalajara' },
  { nicheId: 'belleza_tatuajes', plataforma: 'facebook_group', nombre: 'Tatuajes y Modificaciones Corporales CDMX', alcance: 'local', miembros: 175000, estado: 'CDMX', ciudad: 'CDMX' },
  { nicheId: 'belleza_tatuajes', plataforma: 'facebook_group', nombre: 'Tatuadores y Estudios de Tinta Monterrey', alcance: 'local', miembros: 62000, estado: 'Nuevo León', ciudad: 'Monterrey' },
  { nicheId: 'belleza_tatuajes', plataforma: 'facebook_group', nombre: 'Bazar de Belleza, Estéticas y Tatuajes Mazatlán', alcance: 'local', miembros: 43000, estado: 'Sinaloa', ciudad: 'Mazatlán' },
  { nicheId: 'belleza_tatuajes', plataforma: 'instagram_network', nombre: 'Red de Estudios de Tatuaje y Belleza México', alcance: 'nacional', miembros: 95000, estado: 'General' },

  // Gastronomía
  { nicheId: 'gastronomia', plataforma: 'facebook_group', nombre: 'Amantes de la Comida Callejera y Restaurantes MX', alcance: 'nacional', miembros: 320000, estado: 'General' },
  { nicheId: 'gastronomia', plataforma: 'facebook_group', nombre: 'Ruta del Sabor y Promociones Gastronómicas Jalisco', alcance: 'estatal', miembros: 145000, estado: 'Jalisco' },
  { nicheId: 'gastronomia', plataforma: 'facebook_group', nombre: 'Donde Comer Rico CDMX - Recomendaciones y Ofertas', alcance: 'local', miembros: 280000, estado: 'CDMX', ciudad: 'CDMX' },
  { nicheId: 'gastronomia', plataforma: 'facebook_group', nombre: 'Comida Rica y Restaurantes Mazatlán & Playas', alcance: 'local', miembros: 79000, estado: 'Sinaloa', ciudad: 'Mazatlán' },
  { nicheId: 'gastronomia', plataforma: 'facebook_group', nombre: 'Foodies Monterrey - Los Mejores Lugares para Comer', alcance: 'local', miembros: 110000, estado: 'Nuevo León', ciudad: 'Monterrey' },

  // Hogar e Inmuebles
  { nicheId: 'hogar_inmuebles', plataforma: 'facebook_group', nombre: 'Bienes Raíces y Renta de Casas México Oficial', alcance: 'nacional', miembros: 290000, estado: 'General' },
  { nicheId: 'hogar_inmuebles', plataforma: 'facebook_group', nombre: 'Inmuebles y Remodelaciones Jalisco / Zapopan', alcance: 'local', miembros: 98000, estado: 'Jalisco', ciudad: 'Guadalajara' },
  { nicheId: 'hogar_inmuebles', plataforma: 'facebook_group', nombre: 'Casas y Departamentos en Renta y Venta CDMX', alcance: 'local', miembros: 310000, estado: 'CDMX', ciudad: 'CDMX' },

  // Servicios Profesionales
  { nicheId: 'servicios_profesionales', plataforma: 'facebook_group', nombre: 'Red de Emprendedores y Servicios Profesionales México', alcance: 'nacional', miembros: 165000, estado: 'General' },
  { nicheId: 'servicios_profesionales', plataforma: 'facebook_group', nombre: 'Contadores, Abogados y Consultoría Pymes México', alcance: 'nacional', miembros: 78000, estado: 'General' },

  // Comercio General
  { nicheId: 'comercio_general', plataforma: 'facebook_group', nombre: 'Gran Bazar Compra y Venta Todo México', alcance: 'nacional', miembros: 420000, estado: 'General' },
  { nicheId: 'comercio_general', plataforma: 'facebook_group', nombre: 'Bazar Nocturno y Ofertas Locales Guadalajara', alcance: 'local', miembros: 155000, estado: 'Jalisco', ciudad: 'Guadalajara' },
  { nicheId: 'comercio_general', plataforma: 'facebook_group', nombre: 'Tianguis y Comercio Virtual CDMX y Alrededores', alcance: 'local', miembros: 350000, estado: 'CDMX', ciudad: 'CDMX' },
  { nicheId: 'comercio_general', plataforma: 'facebook_group', nombre: 'Bazar Mazatlán - Ofertas, Negocios y Emprendedores', alcance: 'local', miembros: 92000, estado: 'Sinaloa', ciudad: 'Mazatlán' },

  // Salud y Fitness
  { nicheId: 'salud_fitness', plataforma: 'facebook_group', nombre: 'Comunidad Fitness y Salud Integral México', alcance: 'nacional', miembros: 140000, estado: 'General' },
  { nicheId: 'salud_fitness', plataforma: 'facebook_group', nombre: 'Vida Sana, Gym y Nutrición Guadalajara', alcance: 'local', miembros: 65000, estado: 'Jalisco', ciudad: 'Guadalajara' },

  // Tecnología
  { nicheId: 'tecnologia_gadgets', plataforma: 'facebook_group', nombre: 'Mercado Gamer y Electrónica México', alcance: 'nacional', miembros: 195000, estado: 'General' },
  { nicheId: 'tecnologia_gadgets', plataforma: 'facebook_group', nombre: 'Reparación y Venta de Celulares CDMX / Plaza de la Tecnología', alcance: 'local', miembros: 130000, estado: 'CDMX', ciudad: 'CDMX' },
];

async function seed() {
  console.log('--- Iniciando Seed del Banco de Cerebro ---');

  for (const n of NICHES) {
    console.log(`Insertando nicho: ${n.nombre}`);
    const sql = `
      INSERT INTO market_niches (id, nombre, descripcion, keywords, hashtags, audiencia_objetivo, angulo_gancho, activo)
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, true)
      ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        keywords = EXCLUDED.keywords,
        hashtags = EXCLUDED.hashtags,
        audiencia_objetivo = EXCLUDED.audiencia_objetivo,
        angulo_gancho = EXCLUDED.angulo_gancho,
        activo = true;
    `;
    await query(sql, [
      n.id,
      n.nombre,
      n.descripcion,
      JSON.stringify(n.keywords),
      JSON.stringify(n.hashtags),
      n.audiencia_objetivo,
      n.angulo_gancho,
    ]);
  }

  console.log(`Insertando ${COMMUNITIES_TEMPLATE.length} comunidades en el banco de difusión...`);
  for (const c of COMMUNITIES_TEMPLATE) {
    const sql = `
      INSERT INTO brain_communities (niche_id, plataforma, nombre, pais, estado, ciudad, tipo_alcance, miembros_estimados, nivel_interaccion, activo)
      VALUES ($1, $2, $3, 'México', $4, $5, $6, $7, 'alta', true)
      ON CONFLICT DO NOTHING;
    `;
    await query(sql, [
      c.nicheId,
      c.plataforma,
      c.nombre,
      c.estado,
      c.ciudad || null,
      c.alcance,
      c.miembros,
    ]);
  }

  const countNiches = await query('SELECT count(*) FROM market_niches;');
  const countComm = await query('SELECT count(*) FROM brain_communities;');
  console.log('--- Seed completado con éxito ---');
  console.log(`Total de nichos activos en el Banco de Cerebro: ${countNiches.rows[0][0]}`);
  console.log(`Total de comunidades en la red de difusión: ${countComm.rows[0][0]}`);
}

seed().catch((err) => {
  console.error('Error durante el seed:', err);
  process.exit(1);
});
