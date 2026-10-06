/**
 * Generador de Flyers Publicitarios de Alta Definición para PubliVende
 * Produce flyers cuadrados (1080x1080) optimizados para Instagram, Facebook y estados de WhatsApp.
 */

export interface FlyerDesignData {
  businessName: string;
  headline: string;
  subheadline: string;
  badge: string;
  ctaText?: string;
  city?: string;
  phone?: string;
  theme?: "food" | "fashion" | "service" | "tech" | "vibrant";
}

interface ThemePalette {
  bgStart: string;
  bgEnd: string;
  accent: string;
  accentLight: string;
  badgeBg: string;
  badgeText: string;
  textColor: string;
  subtextColor: string;
  cardBg: string;
  borderColor: string;
  tagline: string;
}

const THEMES: Record<NonNullable<FlyerDesignData["theme"]>, ThemePalette> = {
  food: {
    bgStart: "#1c0a00",
    bgEnd: "#451205",
    accent: "#f97316",
    accentLight: "#fbbf24",
    badgeBg: "#ef4444",
    badgeText: "#ffffff",
    textColor: "#ffffff",
    subtextColor: "#fed7aa",
    cardBg: "rgba(30, 10, 5, 0.75)",
    borderColor: "rgba(249, 115, 22, 0.4)",
    tagline: "Sabor & Calidad Inigualable",
  },
  fashion: {
    bgStart: "#1e0826",
    bgEnd: "#3b0764",
    accent: "#ec4899",
    accentLight: "#f472b6",
    badgeBg: "#a855f7",
    badgeText: "#ffffff",
    textColor: "#ffffff",
    subtextColor: "#fbcfe8",
    cardBg: "rgba(35, 10, 45, 0.75)",
    borderColor: "rgba(236, 72, 153, 0.4)",
    tagline: "Tendencia & Estilo Exclusivo",
  },
  service: {
    bgStart: "#031525",
    bgEnd: "#0c4a6e",
    accent: "#06b6d4",
    accentLight: "#38bdf8",
    badgeBg: "#10b981",
    badgeText: "#ffffff",
    textColor: "#ffffff",
    subtextColor: "#bae6fd",
    cardBg: "rgba(5, 25, 45, 0.75)",
    borderColor: "rgba(6, 182, 212, 0.4)",
    tagline: "Atención Profesional & Confianza",
  },
  tech: {
    bgStart: "#09090b",
    bgEnd: "#1e1b4b",
    accent: "#8b5cf6",
    accentLight: "#c084fc",
    badgeBg: "#6366f1",
    badgeText: "#ffffff",
    textColor: "#ffffff",
    subtextColor: "#e0e7ff",
    cardBg: "rgba(15, 15, 25, 0.75)",
    borderColor: "rgba(139, 92, 246, 0.4)",
    tagline: "Innovación & Eficiencia",
  },
  vibrant: {
    bgStart: "#18062b",
    bgEnd: "#581c87",
    accent: "#f59e0b",
    accentLight: "#fbbf24",
    badgeBg: "#dc2626",
    badgeText: "#ffffff",
    textColor: "#ffffff",
    subtextColor: "#fef3c7",
    cardBg: "rgba(30, 10, 45, 0.75)",
    borderColor: "rgba(245, 158, 11, 0.4)",
    tagline: "Promoción Especial PubliVende",
  },
};

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxCharsPerLine = 22): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 3); // Max 3 líneas
}

/** Genera el SVG completo del flyer promocional (1080 x 1080) */
export function generateFlyerSVG(data: FlyerDesignData): string {
  const theme = THEMES[data.theme ?? "vibrant"];
  const bName = escapeXml(data.businessName || "Tu Negocio");
  const badgeText = escapeXml(data.badge || "PROMO ESPECIAL");
  const headlineLines = wrapText(data.headline || "¡OFERTA IMPERDIBLE!", 20);
  const subheadline = escapeXml(data.subheadline || "Válido por tiempo limitado. ¡Aprovecha hoy mismo!");
  const ctaText = escapeXml(data.ctaText || "Escríbenos por WhatsApp");
  const city = escapeXml(data.city ? ` · ${data.city}` : "");
  const phone = escapeXml(data.phone ? ` · ${data.phone}` : "");

  const headlineSvg = headlineLines
    .map((line, i) => {
      const y = 490 + i * 85;
      return `<tspan x="540" y="${y}" text-anchor="middle">${escapeXml(line.toUpperCase())}</tspan>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
    <!-- Gradiente de Fondo -->
    <radialGradient id="bgGlow" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="${theme.bgEnd}" stop-opacity="1" />
      <stop offset="100%" stop-color="${theme.bgStart}" stop-opacity="1" />
    </radialGradient>

    <!-- Gradiente de Acento -->
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.accentLight}" />
      <stop offset="100%" stop-color="${theme.accent}" />
    </linearGradient>

    <!-- Sombra suave para textos -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.8" />
    </filter>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Fondo base -->
  <rect width="1080" height="1080" fill="url(#bgGlow)" />

  <!-- Patrones geométricos elegantes de fondo -->
  <circle cx="540" cy="460" r="420" fill="none" stroke="${theme.borderColor}" stroke-width="2" stroke-dasharray="8 8" opacity="0.6" />
  <circle cx="540" cy="460" r="340" fill="none" stroke="${theme.accent}" stroke-width="1.5" opacity="0.25" />
  <circle cx="540" cy="460" r="260" fill="none" stroke="${theme.borderColor}" stroke-width="1" stroke-dasharray="4 4" opacity="0.4" />

  <!-- Destellos decorativos -->
  <path d="M140,240 L160,260 L140,280 L120,260 Z" fill="${theme.accentLight}" opacity="0.7" />
  <path d="M940,280 L955,295 L940,310 L925,295 Z" fill="${theme.accentLight}" opacity="0.7" />
  <path d="M180,820 L195,835 L180,850 L165,835 Z" fill="${theme.accent}" opacity="0.6" />
  <path d="M900,800 L920,820 L900,840 L880,820 Z" fill="${theme.accent}" opacity="0.6" />

  <!-- Tarjeta Central de Contenido -->
  <rect x="90" y="90" width="900" height="900" rx="40" fill="${theme.cardBg}" stroke="${theme.borderColor}" stroke-width="2.5" />

  <!-- Encabezado de Marca -->
  <g filter="url(#shadow)">
    <!-- Pill de Marca -->
    <rect x="290" y="140" width="500" height="64" rx="32" fill="rgba(255,255,255,0.08)" stroke="${theme.borderColor}" stroke-width="1.5" />
    <text x="540" y="181" font-family="'Inter', system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" fill="${theme.accentLight}" text-anchor="middle" letter-spacing="2">
      ${bName.toUpperCase()}${city ? city.toUpperCase() : ""}
    </text>
  </g>

  <!-- Tagline de Giro -->
  <text x="540" y="245" font-family="'Inter', system-ui, sans-serif" font-size="16" font-weight="500" fill="${theme.subtextColor}" text-anchor="middle" letter-spacing="3" opacity="0.85">
    ${theme.tagline.toUpperCase()}
  </text>

  <!-- Badge de Promoción / Oferta -->
  <g filter="url(#shadow)">
    <rect x="340" y="295" width="400" height="72" rx="36" fill="${theme.badgeBg}" />
    <text x="540" y="342" font-family="'Inter', system-ui, sans-serif" font-size="28" font-weight="900" fill="${theme.badgeText}" text-anchor="middle" letter-spacing="3">
      🔥 ${badgeText.toUpperCase()} 🔥
    </text>
  </g>

  <!-- Titular Principal (Headline) -->
  <g filter="url(#shadow)">
    <text font-family="'Inter', system-ui, -apple-system, sans-serif" font-size="70" font-weight="900" fill="${theme.textColor}" letter-spacing="-1">
      ${headlineSvg}
    </text>
  </g>

  <!-- Línea decorativa con acento -->
  <rect x="390" y="720" width="300" height="5" rx="2.5" fill="url(#accentGrad)" />

  <!-- Subtítulo / Descripción de la Oferta -->
  <text x="540" y="775" font-family="'Inter', system-ui, sans-serif" font-size="24" font-weight="500" fill="${theme.subtextColor}" text-anchor="middle">
    ${subheadline}
  </text>

  <!-- Botón Call To Action (WhatsApp) -->
  <g filter="url(#shadow)">
    <rect x="220" y="830" width="640" height="96" rx="48" fill="url(#accentGrad)" />
    <!-- Icono WhatsApp SVG incorporado -->
    <g transform="translate(260, 856) scale(1.8)">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.59 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.44 19.65L5.27 16.61L5.09 16.31C4.26 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z" fill="#ffffff"/>
    </g>
    <text x="560" y="891" font-family="'Inter', system-ui, sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">
      ${ctaText.toUpperCase()}${phone}
    </text>
  </g>

  <!-- Footer con sello de garantía PubliVende -->
  <text x="540" y="960" font-family="'Inter', system-ui, sans-serif" font-size="15" font-weight="600" fill="rgba(255,255,255,0.45)" text-anchor="middle" letter-spacing="2">
    ⚡ IMPULSADO POR PUBLIVENDE · DISTRIBUCIÓN OFICIAL EN RED
  </text>
</svg>`;
}

/** Convierte el SVG a Data URL lista para `<img>` o descarga */
export function svgToDataUrl(svg: string): string {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    const encoded = window.btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${encoded}`;
  }
  const buffer = Buffer.from(svg, "utf-8");
  return `data:image/svg+xml;base64,${buffer.toString("base64")}`;
}

/**
 * Convierte el SVG a un PNG de alta resolución (1080x1080) usando Canvas en el navegador
 */
export async function renderFlyerToCanvasPng(svg: string): Promise<string> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return svgToDataUrl(svg);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const dataUrl = svgToDataUrl(svg);
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, 1080, 1080);
        const pngUrl = canvas.toDataURL("image/png", 0.95);
        resolve(pngUrl);
      } catch {
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}
