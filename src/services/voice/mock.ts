// Voz para WhatsApp: TTS (SpeechSynthesis) + grabación real (MediaRecorder) cuando exista.

export function isTTSSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
export function isRecorderSupported() {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof (window as unknown as { MediaRecorder?: unknown }).MediaRecorder === "function"
  );
}
export function isVoiceSupported() {
  return isTTSSupported() || isRecorderSupported();
}

let cachedVoices: SpeechSynthesisVoice[] = [];
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isTTSSupported()) return resolve([]);
    const v = window.speechSynthesis.getVoices();
    if (v.length) {
      cachedVoices = v;
      return resolve(v);
    }
    const onv = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      window.speechSynthesis.removeEventListener("voiceschanged", onv);
      resolve(cachedVoices);
    };
    window.speechSynthesis.addEventListener("voiceschanged", onv);
    setTimeout(() => resolve(cachedVoices), 800);
  });
}

export async function reproducirAudio(
  texto: string,
  opts?: { voz?: "neutro" | "mexico" | "colombia" | "argentina"; onEnd?: () => void },
) {
  if (!isTTSSupported()) {
    opts?.onEnd?.();
    return false;
  }
  window.speechSynthesis.cancel();
  const voices = await loadVoices();
  const u = new SpeechSynthesisUtterance(texto);
  const langMap: Record<string, string> = { neutro: "es-MX", mexico: "es-MX", colombia: "es-CO", argentina: "es-AR" };
  u.lang = langMap[opts?.voz ?? "mexico"];
  const match = voices.find((v) => v.lang.toLowerCase().startsWith(u.lang.toLowerCase())) ?? voices.find((v) => v.lang.startsWith("es"));
  if (match) u.voice = match;
  u.rate = 1.05;
  u.pitch = 1;
  if (opts?.onEnd) u.onend = opts.onEnd;
  window.speechSynthesis.speak(u);
  return true;
}

export function detenerAudio() {
  if (isTTSSupported()) window.speechSynthesis.cancel();
}

// Grabador real para enviar nota de voz desde el navegador.
export interface VoiceRecorder {
  stop: () => Promise<{ blob: Blob; url: string; durSeg: number }>;
  cancel: () => void;
}
export async function startRecording(): Promise<VoiceRecorder> {
  if (!isRecorderSupported()) throw new Error("Recorder no soportado");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = (window as unknown as { MediaRecorder: { isTypeSupported(t: string): boolean } }).MediaRecorder.isTypeSupported(
    "audio/webm",
  )
    ? "audio/webm"
    : "";
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  const t0 = Date.now();
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start();
  return {
    cancel: () => {
      try {
        rec.stop();
      } catch {/* noop */}
      stream.getTracks().forEach((t) => t.stop());
    },
    stop: () =>
      new Promise((resolve) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: mime || "audio/webm" });
          const reader = new FileReader();
          reader.onloadend = () =>
            resolve({
              blob,
              url: reader.result as string,
              durSeg: Math.max(1, Math.round((Date.now() - t0) / 1000)),
            });
          reader.readAsDataURL(blob);
        };
        rec.stop();
      }),
  };
}

// Transcripción mock — "convierte" un audio entrante en texto
export async function transcribir(_durSeg: number): Promise<string> {
  await new Promise((r) => setTimeout(r, 600));
  const opciones = [
    "Hola, quiero saber si tienen disponible y cuánto cuesta el envío a mi ciudad",
    "Buenos días, me interesa el producto del Reel, ¿qué tallas tienen?",
    "Hola, ¿aceptan pago en efectivo contra entrega?",
    "¿Tienen descuentos por mayoreo? Quiero llevar 5 piezas",
  ];
  return opciones[Math.floor(Math.random() * opciones.length)];
}
