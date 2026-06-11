/** Datos de ubicación para segmentación local (demo — listo para API geográfica real). */

import { MEXICO_ESTADOS_CIUDADES, buscarMunicipioEnMexico } from "./geo-mexico";

export type AlcanceTipo = "global" | "local";

export interface PublishAlcance {
  tipo: AlcanceTipo;
  pais?: string;
  pais_codigo?: string;
  estado?: string;
  ciudad?: string;
  radio_km?: number;
}

export interface GeoPais {
  codigo: string;
  nombre: string;
  estados: Record<string, string[]>;
}

export const GEO_PAISES: GeoPais[] = [
  {
    codigo: "MX",
    nombre: "México",
    estados: MEXICO_ESTADOS_CIUDADES,
  },
  {
    codigo: "CO",
    nombre: "Colombia",
    estados: {
      Bogotá: ["Bogotá D.C.", "Chapinero", "Usaquén"],
      Antioquia: ["Medellín", "Envigado", "Bello"],
      Valle: ["Cali", "Palmira", "Buenaventura"],
      Atlántico: ["Barranquilla", "Soledad"],
    },
  },
  {
    codigo: "AR",
    nombre: "Argentina",
    estados: {
      "Buenos Aires": ["CABA", "La Plata", "Mar del Plata"],
      Córdoba: ["Córdoba", "Villa Carlos Paz"],
      Mendoza: ["Mendoza", "Godoy Cruz"],
    },
  },
  {
    codigo: "CL",
    nombre: "Chile",
    estados: {
      Metropolitana: ["Santiago", "Providencia", "Las Condes"],
      Valparaíso: ["Viña del Mar", "Valparaíso"],
    },
  },
  {
    codigo: "PE",
    nombre: "Perú",
    estados: {
      Lima: ["Lima", "Miraflores", "San Isidro"],
      Arequipa: ["Arequipa", "Cayma"],
    },
  },
];

export function findPaisByCodigo(codigo: string): GeoPais | undefined {
  return GEO_PAISES.find((p) => p.codigo === codigo);
}

export function findPaisByNombre(nombre: string): GeoPais | undefined {
  return GEO_PAISES.find((p) => p.nombre === nombre);
}

export function estadosDePais(pais: GeoPais): string[] {
  return Object.keys(pais.estados).sort((a, b) => a.localeCompare(b, "es"));
}

export function ciudadesDeEstado(pais: GeoPais, estado: string): string[] {
  const list = pais.estados[estado] ?? [];
  return [...list].sort((a, b) => a.localeCompare(b, "es"));
}

/** Ubicación inicial para México según ciudad del perfil. */
export function ubicacionInicialMexico(ciudadPerfil?: string): { estado: string; ciudad: string } {
  const fallback = { estado: "Ciudad de México", ciudad: "Benito Juárez" };
  if (!ciudadPerfil?.trim()) return fallback;

  const busqueda = ciudadPerfil.trim();
  if (busqueda.toUpperCase() === "CDMX") return fallback;

  const found = buscarMunicipioEnMexico(busqueda);
  if (found) return { estado: found.estado, ciudad: found.municipio };

  return { estado: "Ciudad de México", ciudad: busqueda };
}

/** Texto legible del alcance para preview y posts. */
export function formatAlcanceLabel(alcance: PublishAlcance): string {
  if (alcance.tipo === "global") return "Alcance global";
  const parts = [alcance.ciudad, alcance.estado, alcance.pais].filter(Boolean);
  const lugar = parts.join(", ") || "ubicación local";
  return `${lugar} · ${alcance.radio_km ?? 25} km`;
}

/** País por defecto según código telefónico del perfil. */
export function paisFromCodigoTelefono(codigo: string): GeoPais {
  const map: Record<string, string> = {
    "+52": "MX",
    "+57": "CO",
    "+54": "AR",
    "+56": "CL",
    "+51": "PE",
  };
  return findPaisByCodigo(map[codigo] ?? "MX") ?? GEO_PAISES[0];
}
