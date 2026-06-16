import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { loadDB, saveDB, uid, ensureUserSeeded } from "@/lib/mock/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendMessage, updateContact } from "@/services/whatsapp/mock";
import { processIncomingMessage } from "@/services/whatsapp/engine";
import { generatePostAwareReply } from "@/services/whatsapp/post-reply";
import { buildPostPageUrl } from "@/lib/whatsapp-post";
import {
  reproducirAudio,
  detenerAudio,
  transcribir,
  isVoiceSupported,
  isRecorderSupported,
  isTTSSupported,
  startRecording,
  type VoiceRecorder,
} from "@/services/voice/mock";
import { Bot, Send, ShoppingBag, Sparkles, Mic, Play, Square, Flame, MicOff, Filter, DollarSign, Copy as CopyIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { EtapaLead, PagoProvider } from "@/lib/mock/types";
import { generarLinkCobro, PROVIDER_LABEL, parseCobrarCommand, type CobroLink } from "@/lib/payments";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/whatsapp")({ component: WA });

const ETAPAS: EtapaLead[] = ["nuevo", "contactado", "negociando", "ganado", "perdido"];
const ETAPA_COLORS: Record<EtapaLead, string> = {
  nuevo: "bg-blue-500", contactado: "bg-purple-500", negociando: "bg-amber-500", ganado: "bg-green-500", perdido: "bg-gray-400",
};

function WA() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const contacts = useDB((db) => db.whatsapp_contacts.filter((c) => c.user_id === user?.id));
  const messages = useDB((db) => db.whatsapp_messages);
  const posts = useDB((db) => db.posts.filter((p) => p.user_id === user?.id));
  const productos = useDB((db) => db.productos.filter((p) => p.user_id === user?.id && p.activo));
  const [selId, setSelId] = useState<string | null>(null);
  const sel = contacts.find((c) => c.id === selId);
  const selPost = sel?.post_origen_id ? posts.find((p) => p.id === sel.post_origen_id) : undefined;

  useEffect(() => {
    if (user?.is_admin) ensureUserSeeded(user.id);
  }, [user?.id, user?.is_admin]);

  useEffect(() => {
    if (contacts.length > 0 && !selId) setSelId(contacts[0].id);
  }, [contacts, selId]);
  const [onlyAudio, setOnlyAudio] = useState(false);
  const chat = useMemo(() => {
    const list = messages.filter((m) => m.contact_id === selId);
    const filtered = onlyAudio ? list.filter((m) => m.tipo_media === "audio") : list;
    return filtered.sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
  }, [messages, selId, onlyAudio]);
  const [txt, setTxt] = useState("");
  const [view, setView] = useState<"inbox" | "kanban">("inbox");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<VoiceRecorder | null>(null);

  const voiceOK = isVoiceSupported();
  const recOK = isRecorderSupported();
  const ttsOK = isTTSSupported();

  // Cobro
  const [cobroOpen, setCobroOpen] = useState(false);
  const [cobroMonto, setCobroMonto] = useState("");
  const [cobroDesc, setCobroDesc] = useState("");
  const [cobroProvider, setCobroProvider] = useState<PagoProvider>(user?.pago_provider_default ?? "stripe");
  const [cobroMoneda, setCobroMoneda] = useState("MXN");
  const [cobroLink, setCobroLink] = useState<CobroLink | null>(null);

  function abrirCobro(monto = "", desc = "") {
    setCobroMonto(monto); setCobroDesc(desc); setCobroLink(null); setCobroOpen(true);
  }

  function generarCobro() {
    const monto = Number(cobroMonto);
    if (!Number.isFinite(monto) || monto <= 0) return toast.error("Monto inválido");
    const link = generarLinkCobro({ provider: cobroProvider, monto, moneda: cobroMoneda, descripcion: cobroDesc || "Pago PubliVende" });
    setCobroLink(link);
    toast.success(`Link de cobro generado vía ${PROVIDER_LABEL[cobroProvider]}`);
  }

  async function enviarLinkCobro() {
    if (!cobroLink || !selId) return;
    const msg = `💳 *Link de pago seguro*\n${cobroLink.descripcion}\n*Total:* $${cobroLink.monto} ${cobroLink.moneda}\nVía ${PROVIDER_LABEL[cobroLink.provider]}\n\n👉 ${cobroLink.url}\n\nRef: ${cobroLink.referencia}`;
    await sendMessage(selId, msg);
    setCobroOpen(false);
    toast.success("Link enviado al cliente 💸");
  }

  async function enviar() {
    if (!txt || !selId) return;
    // Detectar comando /cobrar
    const cmd = parseCobrarCommand(txt);
    if (cmd) {
      setTxt("");
      abrirCobro(String(cmd.monto), cmd.descripcion);
      return;
    }
    await sendMessage(selId, txt);
    setTxt("");
  }

  async function enviarAudioTTS() {
    if (!txt || !selId) return;
    const duracion = Math.max(3, Math.round(txt.length / 14));
    const db = loadDB();
    db.whatsapp_messages.push({
      id: uid(), contact_id: selId, direccion: "saliente",
      texto: txt, automatico: false, timestamp: new Date().toISOString(),
      tipo_media: "audio", duracion_seg: duracion,
    });
    saveDB(db);
    reproducirAudio(txt);
    setTxt("");
    toast.success(`Audio enviado (${duracion}s)`);
  }

  async function comenzarGrabacion() {
    if (!selId) return;
    if (!recOK) {
      toast.error("Tu navegador no permite grabar. Usa 'Enviar como audio' (TTS).");
      return;
    }
    try {
      recRef.current = await startRecording();
      setRecording(true);
      toast.message("Grabando…", { description: "Pulsa de nuevo para enviar." });
    } catch (e) {
      console.error(e);
      toast.error("Permiso de micrófono denegado");
    }
  }

  async function detenerYEnviar() {
    if (!recRef.current || !selId) return;
    const { url, durSeg } = await recRef.current.stop();
    recRef.current = null;
    setRecording(false);
    const db = loadDB();
    db.whatsapp_messages.push({
      id: uid(), contact_id: selId, direccion: "saliente",
      texto: txt || "🎤 Nota de voz", automatico: false,
      timestamp: new Date().toISOString(),
      tipo_media: "audio", duracion_seg: durSeg, audio_url: url,
    });
    saveDB(db);
    setTxt("");
    toast.success(`Audio grabado (${durSeg}s)`);
  }

  function cancelarGrabacion() {
    recRef.current?.cancel();
    recRef.current = null;
    setRecording(false);
  }

  function togglePlay(id: string, texto: string, audioUrl?: string) {
    if (audioUrl) {
      // El <audio controls> ya lo maneja; solo destacamos
      return;
    }
    if (!ttsOK) { toast.error("Tu navegador no reproduce audio sintetizado"); return; }
    if (playingId === id) { detenerAudio(); setPlayingId(null); return; }
    reproducirAudio(texto, { onEnd: () => setPlayingId((p) => (p === id ? null : p)) });
    setPlayingId(id);
    setTimeout(() => setPlayingId((p) => (p === id ? null : p)), Math.max(2000, texto.length * 70));
  }

  async function transcribirEntrante(mid: string, dur: number) {
    toast.loading("Transcribiendo audio…", { id: "tr" });
    const t = await transcribir(dur);
    const db = loadDB();
    const m = db.whatsapp_messages.find((x) => x.id === mid);
    if (m) { m.transcripcion = t; saveDB(db); }
    toast.success("Transcripción lista", { id: "tr" });
  }

  async function sugerirIA() {
    if (!sel || !user) return;
    toast.loading("Generando sugerencia con IA…", { id: "ia" });
    await new Promise((r) => setTimeout(r, 600));
    const ultimo = chat[chat.length - 1]?.texto ?? "";

    if (sel.post_origen_id) {
      const postReply = generatePostAwareReply(user.id, sel, ultimo, sel.post_origen_id);
      if (postReply) {
        setTxt(postReply);
        toast.success("Sugerencia basada en la publicación del contacto", { id: "ia" });
        return;
      }
    }

    const ultimoLower = ultimo.toLowerCase();
    let r = `¡Hola ${sel.nombre.split(" ")[0]}! Con gusto te ayudo desde ${user.nombre_negocio ?? "nuestro negocio"} 💜`;
    if (ultimoLower.includes("precio")) {
      r = `Te paso el precio de nuestro catálogo:\n${productos.map((p) => `• ${p.nombre}: $${p.precio}`).join("\n")}`;
    }
    if (ultimoLower.includes("envío") || ultimoLower.includes("envio")) {
      r = `Sí hacemos envíos${user.ciudad ? ` desde ${user.ciudad}` : ""}. ¿A qué ciudad te enviamos?`;
    }
    if (productos[0]) r += `\n\nTe recomiendo: ${productos[0].nombre} - $${productos[0].precio} ${productos[0].moneda}`;
    setTxt(r);
    toast.success("Sugerencia lista", { id: "ia" });
  }

  async function simularCliente() {
    if (!user) return;
    const lastPost = posts.find((p) => p.estado === "publicado") ?? posts[0];
    const ref = lastPost?.tracking_slug ?? "demo123";
    const result = await processIncomingMessage(user.id, {
      nombre: "Cliente demo",
      celular: "+52 55 1234-5678",
      texto: lastPost
        ? `Hola, vi tu publicación ${buildPostPageUrl(ref)} — ¿cuánto cuesta? (ref: ${ref})`
        : "Hola, vi tu publicación. ¿Cuál es el precio?",
      post_origen_id: lastPost?.id,
      origen: lastPost ? `Broadcast: ${lastPost.copy.slice(0, 40)}…` : "Reel de Instagram (demo)",
    });
    setSelId(result.contact.id);
    toast.success(result.autoReplies.length
      ? `IA respondió sobre la publicación (${result.autoReplies.length} mensaje${result.autoReplies.length > 1 ? "s" : ""})`
      : "Contacto creado en CRM");
  }

  async function enviarProducto(pid: string) {
    const p = productos.find((x) => x.id === pid);
    if (!p || !selId) return;
    await sendMessage(selId, `🛍️ *${p.nombre}*\n💰 $${p.precio} ${p.moneda}\n${p.descripcion}\n\n👉 Compra aquí: ${p.link_pago}`);
    toast.success("Producto enviado");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold">WhatsApp CRM</h1>
        <Tabs value={view} onValueChange={(v) => setView(v as "inbox" | "kanban")}>
          <TabsList><TabsTrigger value="inbox">Inbox</TabsTrigger><TabsTrigger value="kanban">Pipeline</TabsTrigger></TabsList>
        </Tabs>
      </div>

      {!voiceOK && (
        <Card className="p-3 text-xs bg-amber-50 border-amber-200 text-amber-800">
          ⚠️ Tu navegador no soporta voz (ni TTS ni grabación). Prueba Chrome / Edge para usar audios.
        </Card>
      )}

      {view === "inbox" ? (
        <div className="grid lg:grid-cols-[280px_1fr_280px] gap-3 h-[calc(100vh-12rem)]">
          <Card className="overflow-y-auto">
            {contacts.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground space-y-3">
                <p>Tu CRM se llena solo cuando clientes escriben por WhatsApp.</p>
                <p className="text-xs">Completa el onboarding con tus productos para activar respuestas automáticas.</p>
                {user?.onboarding_completado ? (
                  <Button size="sm" variant="outline" onClick={simularCliente}>
                    Simular cliente que pregunta precio
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => navigate({ to: "/onboarding" })}>
                    Completar configuración
                  </Button>
                )}
                {user?.is_admin && (
                  <Button size="sm" variant="ghost" onClick={() => {
                    if (user?.id && ensureUserSeeded(user.id)) toast.success("Datos demo cargados");
                  }}>
                    Cargar demo admin
                  </Button>
                )}
              </div>
            ) : contacts.map((c) => (
              <button key={c.id} onClick={() => { setSelId(c.id); if (c.no_leidos) updateContact(c.id, { no_leidos: 0 }); }}
                className={`w-full text-left p-3 border-b hover:bg-muted ${selId === c.id ? "bg-accent" : ""}`}>
                <div className="flex justify-between items-start"><div className="font-semibold text-sm">{c.nombre}</div>
                  {c.no_leidos > 0 && <span className="bg-whatsapp text-white text-[10px] rounded-full px-1.5 min-w-5 text-center">{c.no_leidos}</span>}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{c.origen}</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${ETAPA_COLORS[c.etapa]}`} /><span className="text-[10px] capitalize">{c.etapa}</span>
                  {typeof c.lead_score === "number" && (
                    <span className={`ml-auto text-[10px] flex items-center gap-0.5 font-semibold ${c.lead_score >= 70 ? "text-orange-500" : "text-muted-foreground"}`}>
                      <Flame className="w-2.5 h-2.5" />{c.lead_score}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </Card>

          <Card className="flex flex-col overflow-hidden">
            {sel ? (<div className="flex flex-col h-full">
              <div className="p-3 border-b bg-whatsapp/10 flex items-center justify-between">
                <div className="font-semibold">{sel.nombre} <span className="text-xs text-muted-foreground font-normal">· {sel.celular}</span></div>
                <button
                  onClick={() => setOnlyAudio((v) => !v)}
                  className={`text-[11px] flex items-center gap-1 px-2 py-1 rounded ${onlyAudio ? "bg-whatsapp text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  <Filter className="w-3 h-3" />Solo audios
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/30">
                {chat.length === 0 && <div className="text-center text-xs text-muted-foreground py-8">Sin mensajes en este filtro.</div>}
                {chat.map((m) => (
                  <div key={m.id} className={`flex ${m.direccion === "saliente" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.direccion === "saliente" ? "bg-whatsapp text-white" : "bg-white border"}`}>
                      {m.tipo_media === "audio" ? (
                        <div className="space-y-1">
                          {m.audio_url ? (
                            <audio controls src={m.audio_url} className="w-56 h-9" />
                          ) : (
                            <div className="flex items-center gap-2">
                              <button onClick={() => togglePlay(m.id, m.texto, m.audio_url)} className={`w-7 h-7 rounded-full flex items-center justify-center ${m.direccion === "saliente" ? "bg-white/20" : "bg-whatsapp/20"}`}>
                                {playingId === m.id ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                              </button>
                              <div className="flex-1">
                                <div className="h-1 rounded bg-current/30 w-32" />
                                <div className="text-[10px] opacity-70 mt-1">🎤 {m.duracion_seg ?? 5}s {!ttsOK && "(sin TTS)"}</div>
                              </div>
                            </div>
                          )}
                          {m.transcripcion && (
                            <div className={`text-[11px] italic ${m.direccion === "saliente" ? "text-white/80" : "text-muted-foreground"}`}>
                              📝 {m.transcripcion}
                            </div>
                          )}
                          {m.direccion === "entrante" && !m.transcripcion && (
                            <button onClick={() => transcribirEntrante(m.id, m.duracion_seg ?? 5)} className="text-[10px] underline opacity-80">Transcribir</button>
                          )}
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{m.texto}</div>
                      )}
                      <div className="text-[10px] opacity-70 mt-1 flex items-center gap-1 justify-end">{m.automatico && <Bot className="w-3 h-3" />}{new Date(m.timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={sugerirIA} className="gap-1"><Sparkles className="w-3 h-3" />Sugerir IA</Button>
                  <Button size="sm" variant="outline" onClick={enviarAudioTTS} disabled={!txt || !ttsOK} className="gap-1" title={!ttsOK ? "TTS no soportado" : "Convertir el texto en audio"}>
                    <Mic className="w-3 h-3" />Enviar como audio
                  </Button>
                  {recOK && !recording && (
                    <Button size="sm" variant="outline" onClick={comenzarGrabacion} className="gap-1">
                      <Mic className="w-3 h-3" />Grabar
                    </Button>
                  )}
                  {recording && (
                    <>
                      <Button size="sm" onClick={detenerYEnviar} className="gap-1 bg-red-500 hover:bg-red-600 animate-pulse">
                        <Square className="w-3 h-3" />Detener y enviar
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelarGrabacion} className="gap-1">
                        <MicOff className="w-3 h-3" />Cancelar
                      </Button>
                    </>
                  )}
                  <Select onValueChange={enviarProducto}><SelectTrigger className="w-44 h-9"><div className="flex items-center gap-1 text-sm"><ShoppingBag className="w-3 h-3" />Enviar producto</div></SelectTrigger>
                    <SelectContent>{productos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre} - ${p.precio}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => abrirCobro()} className="gap-1 border-green-500 text-green-700 hover:bg-green-50">
                    <DollarSign className="w-3 h-3" />Cobrar
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Textarea rows={2} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder='Escribe un mensaje… (tip: "/cobrar 350 Blusa floral")' />
                  <Button onClick={enviar} size="icon" className="bg-whatsapp hover:bg-whatsapp/90 h-auto"><Send className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>) : <div className="flex-1 flex items-center justify-center text-muted-foreground">Selecciona una conversación</div>}
          </Card>

          <Card className="p-4 overflow-y-auto">
            {sel && (<div>
              <div className="font-semibold">{sel.nombre}</div>
              <div className="text-xs text-muted-foreground">{sel.celular}</div>
              <div className="mt-4 space-y-3">
                <div><label className="text-xs text-muted-foreground">Etapa</label>
                  <Select value={sel.etapa} onValueChange={(v) => updateContact(sel.id, { etapa: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{ETAPAS.map((e) => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {sel.etapa === "ganado" && (
                  <div><label className="text-xs text-muted-foreground">Monto venta (MXN)</label>
                    <Input type="number" value={sel.monto_venta ?? ""} onChange={(e) => updateContact(sel.id, { monto_venta: Number(e.target.value) })} />
                  </div>
                )}
                <div><label className="text-xs text-muted-foreground">Origen</label>
                  <div className="text-sm bg-accent rounded px-2 py-1">{sel.origen}</div>
                  {selPost && (
                    <div className="mt-2 rounded-lg border p-2 text-xs space-y-1">
                      <p className="font-semibold text-[10px] uppercase text-muted-foreground">Publicación vinculada</p>
                      <p className="line-clamp-3">{selPost.copy}</p>
                      <a
                        href={buildPostPageUrl(selPost.tracking_slug)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> Ver publicación
                      </a>
                    </div>
                  )}
                  {sel.post_origen_id && !selPost && (
                    <div className="text-[10px] text-success mt-1">✓ Atribuido a publicación</div>
                  )}
                </div>
                <div><label className="text-xs text-muted-foreground">Notas</label>
                  <Textarea rows={4} value={sel.notas} onChange={(e) => updateContact(sel.id, { notas: e.target.value })} />
                </div>
              </div>
            </div>)}
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {ETAPAS.map((etapa) => (
            <Card key={etapa} className="p-3">
              <div className={`text-xs font-semibold mb-3 px-2 py-1 rounded text-white capitalize ${ETAPA_COLORS[etapa]}`}>{etapa} ({contacts.filter((c) => c.etapa === etapa).length})</div>
              <div className="space-y-2">
                {contacts.filter((c) => c.etapa === etapa).map((c) => (
                  <div key={c.id} draggable
                    onDragStart={(e) => e.dataTransfer.setData("id", c.id)}
                    className="p-2 bg-card border rounded text-xs cursor-move">
                    <div className="font-semibold">{c.nombre}</div>
                    <div className="text-muted-foreground truncate">{c.origen}</div>
                    {c.monto_venta && <div className="text-success font-semibold mt-1">${c.monto_venta}</div>}
                  </div>
                ))}
              </div>
              <div className="mt-2 min-h-12 border-2 border-dashed rounded text-center text-[10px] text-muted-foreground py-2"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { const id = e.dataTransfer.getData("id"); if (id) { updateContact(id, { etapa }); toast.success("Lead movido"); }}}>
                Soltar aquí
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={cobroOpen} onOpenChange={setCobroOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600" />Generar link de cobro</DialogTitle></DialogHeader>
          {!cobroLink ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Monto</Label><Input type="number" value={cobroMonto} onChange={(e) => setCobroMonto(e.target.value)} placeholder="350" /></div>
                <div><Label>Moneda</Label>
                  <Select value={cobroMoneda} onValueChange={setCobroMoneda}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>{["MXN","COP","ARS","CLP","USD"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Descripción</Label><Input value={cobroDesc} onChange={(e) => setCobroDesc(e.target.value)} placeholder="Blusa floral talla M" /></div>
              <div><Label>Pasarela</Label>
                <Select value={cobroProvider} onValueChange={(v) => setCobroProvider(v as PagoProvider)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{(["stripe","mercadopago","wompi","payu","kushki","manual"] as PagoProvider[]).map((p) => <SelectItem key={p} value={p}>{PROVIDER_LABEL[p]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={generarCobro} className="w-full bg-gradient-primary border-0">Generar link de pago</Button>
              <p className="text-[10px] text-muted-foreground text-center">Tip: escribe <code>/cobrar 350 descripción</code> directamente en el chat.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Total a cobrar</div>
                <div className="text-2xl font-bold text-green-700">${cobroLink.monto} {cobroLink.moneda}</div>
                <div className="text-xs">{cobroLink.descripcion}</div>
                <div className="text-[10px] text-muted-foreground mt-1">Vía {PROVIDER_LABEL[cobroLink.provider]} · Ref {cobroLink.referencia}</div>
              </div>
              <div className="flex justify-center"><img src={cobroLink.qr_url} alt="QR" className="w-40 h-40 border rounded" /></div>
              <div className="flex gap-2">
                <Input readOnly value={cobroLink.url} className="text-xs" />
                <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(cobroLink.url); toast.success("Link copiado"); }}><CopyIcon className="w-4 h-4" /></Button>
                <Button size="icon" variant="outline" asChild><a href={cobroLink.url} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a></Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setCobroLink(null)}>Nuevo</Button>
                <Button className="flex-1 bg-whatsapp hover:bg-whatsapp/90" onClick={enviarLinkCobro}><Send className="w-4 h-4 mr-2" />Enviar por WhatsApp</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
