// Adaptador mock WhatsApp — listo para reemplazar por WhatsApp Business Cloud API
import { loadDB, saveDB, uid } from "@/lib/mock/db";

export async function sendMessage(contact_id: string, texto: string, automatico = false) {
  const db = loadDB();
  db.whatsapp_messages.push({
    id: uid(), contact_id, direccion: "saliente", texto, automatico,
    timestamp: new Date().toISOString(),
  });
  saveDB(db);
}

export async function updateContact(contact_id: string, patch: Partial<{ etapa: string; etiqueta: string; notas: string; monto_venta: number; no_leidos: number }>) {
  const db = loadDB();
  const c = db.whatsapp_contacts.find((x) => x.id === contact_id);
  if (c) Object.assign(c, patch);
  saveDB(db);
}
