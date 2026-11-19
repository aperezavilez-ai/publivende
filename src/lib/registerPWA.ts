// Desactiva service workers y limpia caches para evitar estilos rotos y datos obsoletos.
export function registerPWA() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).catch(() => {});

    if (typeof caches !== "undefined") {
      caches.keys().then((keys) => {
        keys.forEach((k) => caches.delete(k));
      }).catch(() => {});
    }
  } catch {}
}
