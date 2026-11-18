/**
 * Comprobación ejecutable (Real v1) — NO es suite, es una sonda puntual.
 * Simula fetch para verificar que TikTok solo da ok con PUBLISH_COMPLETE
 * y que Instagram espera FINISHED antes de media_publish.
 * Uso: npx tsx scripts/check-publish-confirmation.ts
 */
process.env.PUBLISH_POLL_INTERVAL_MS = "0";
process.env.IG_POLL_INTERVAL_MS = "0";

// Import dinámico: las constantes de sondeo se leen al cargar el módulo.
const { publishToNetworkMulti } = await import("../src/server/publish/networks");

type FetchFn = typeof fetch;
const realFetch = globalThis.fetch;
let handler: (url: string, init?: RequestInit) => Promise<unknown>;
globalThis.fetch = (async (url: string, init?: RequestInit) => {
  const body = await handler(url, init);
  return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body), headers: { get: () => null } };
}) as FetchFn;

const base = {
  accessToken: "token-de-prueba",
  pageId: "123",
  copy: "hola",
  mediaUrl: "https://ejemplo.com/video.mp4",
  mediaType: "video" as const,
  trackingSlug: "abc",
  appUrl: "https://publivende.mx",
};

let fallos = 0;
function check(nombre: string, cond: boolean, detalle?: string) {
  console.log(`${cond ? "PASS" : "FAIL"} ${nombre}${detalle ? " — " + detalle : ""}`);
  if (!cond) fallos++;
}

// --- TikTok: procesando siempre -> ok:false con publish_id rastreable
handler = async (url) => {
  if (url.includes("/video/init/")) return { data: { publish_id: "pub-1" } };
  if (url.includes("/status/fetch/")) return { data: { status: "PROCESSING_UPLOAD" } };
  throw new Error("url inesperada " + url);
};
let r = await publishToNetworkMulti({ ...base, red: "tiktok" });
check("TikTok sin confirmación no es éxito", r[0].ok === false && (r[0].error ?? "").includes("sigue procesando"), r[0].error);
check("TikTok conserva publish_id para rastreo", r[0].external_id === "pub-1");

// --- TikTok: FAILED -> ok:false con motivo
handler = async (url) => {
  if (url.includes("/video/init/")) return { data: { publish_id: "pub-2" } };
  return { data: { status: "FAILED", fail_reason: "video demasiado corto" } };
};
r = await publishToNetworkMulti({ ...base, red: "tiktok" });
check("TikTok FAILED no es éxito", r[0].ok === false && (r[0].error ?? "").includes("corto"), r[0].error);

// --- TikTok: PUBLISH_COMPLETE -> ok:true
let polls = 0;
handler = async (url) => {
  if (url.includes("/video/init/")) return { data: { publish_id: "pub-3" } };
  polls++;
  return { data: { status: polls < 2 ? "PROCESSING_DOWNLOAD" : "PUBLISH_COMPLETE" } };
};
r = await publishToNetworkMulti({ ...base, red: "tiktok" });
check("TikTok PUBLISH_COMPLETE es éxito", r[0].ok === true && r[0].external_id === "pub-3");

// --- Instagram Reel: contenedor ERROR -> ok:false y nunca media_publish
let publishCalls = 0;
handler = async (url) => {
  if (url.endsWith("/media")) return { id: "cont-1" };
  if (url.includes("fields=status_code")) return { status_code: "ERROR" };
  if (url.includes("media_publish")) { publishCalls++; return { id: "ig-1" }; }
  throw new Error("url inesperada " + url);
};
r = await publishToNetworkMulti({ ...base, red: "instagram" });
check("Reel con contenedor ERROR no es éxito", r[0].ok === false, r[0].error);
check("Reel ERROR nunca llama media_publish", publishCalls === 0);

// --- Instagram Reel: IN_PROGRESS -> FINISHED -> media_publish -> ok:true
let statusCalls = 0;
handler = async (url) => {
  if (url.endsWith("/media")) return { id: "cont-2" };
  if (url.includes("fields=status_code")) { statusCalls++; return { status_code: statusCalls < 2 ? "IN_PROGRESS" : "FINISHED" }; }
  if (url.includes("media_publish")) { publishCalls++; return { id: "ig-2" }; }
  throw new Error("url inesperada " + url);
};
r = await publishToNetworkMulti({ ...base, red: "instagram" });
check("Reel FINISHED publica y es éxito", r[0].ok === true && r[0].external_id === "ig-2");

globalThis.fetch = realFetch;
console.log(fallos === 0 ? "TODAS LAS COMPROBACIONES PASARON" : `${fallos} COMPROBACIONES FALLARON`);
process.exit(fallos === 0 ? 0 : 1);
