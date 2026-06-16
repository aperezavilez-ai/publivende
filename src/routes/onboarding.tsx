import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RED_LABELS } from "@/services/social/mock";
import { connectSocialNetwork } from "@/services/social/connectSocial";
import { bootstrapClientFromOnboarding, type OnboardingProductInput } from "@/lib/bootstrap";
import { RECETAS } from "@/lib/recetas";
import { generateCatalogFromBusiness, suggestProductImage } from "@/services/ai/catalog";
import { importStoreFromLink, getStorePlatformLabel, detectStorePlatform } from "@/services/import/storeImport";
import { Instagram, Facebook, Youtube, Music2, Check, MessageCircle, Sparkles, Store, Bot, Plus, Trash2, Wand2, Upload, Package, ImageIcon, Link2 } from "lucide-react";
import { PubliVendeLogo } from "@/components/PubliVendeLogo";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { PagoProvider, Red } from "@/lib/mock/types";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

const ICONS: Record<Red, typeof Instagram> = { instagram: Instagram, facebook: Facebook, tiktok: Music2, youtube: Youtube };
const TONOS = ["casual", "profesional", "divertido", "promocional", "inspirador"];
const TOTAL_STEPS = 5;

const EMPTY_PRODUCT: OnboardingProductInput = { nombre: "", precio: 0, descripcion: "", tipo: "producto" };

function Onboarding() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const accounts = useDB((db) => db.social_accounts.filter((a) => a.user_id === user?.id));

  const [negocio, setNegocio] = useState({
    industria: user?.industria ?? RECETAS[0].industria,
    descripcion: user?.descripcion_negocio ?? "",
    publico: user?.publico_objetivo ?? "",
    tono: user?.tono_marca ?? "casual",
    ciudad: user?.ciudad ?? "",
    horario: user?.horario_atencion ?? "Lunes a sábado, 9am a 7pm",
    pago_provider: (user?.pago_provider_default ?? "stripe") as PagoProvider,
  });

  const [productos, setProductos] = useState<OnboardingProductInput[]>([
    { ...EMPTY_PRODUCT },
  ]);
  const [catalogMode, setCatalogMode] = useState<"manual" | "ai" | "import">("manual");
  const [aiLoading, setAiLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [storeUrl, setStoreUrl] = useState("");
  const [importMeta, setImportMeta] = useState<{ platform: string; tienda: string } | null>(null);
  const [precioRango, setPrecioRango] = useState({ min: 200, max: 1500 });

  const [wa, setWa] = useState({ codigo: user?.codigo_pais ?? "+52", numero: user?.celular ?? "" });

  const [automation, setAutomation] = useState({
    bienvenida: `¡Hola {nombre}! 💜 Gracias por escribir a {negocio}. ¿En qué te ayudamos hoy?`,
    precio: `Te comparto nuestra lista de precios de {negocio}:`,
    palabra_precio: "precio",
    fuera_horario: `Gracias por escribirnos 🌙 Nuestro horario es {horario}. Te respondemos en cuanto abramos.`,
  });

  useEffect(() => {
    if (!user) navigate({ to: "/auth", search: { mode: "login", plan: "free" } });
    else if (user.onboarding_completado) navigate({ to: "/dashboard" });
  }, [user, navigate]);
  if (!user) return null;

  async function conectar(red: Red) {
    await connectSocialNetwork(user!.id, red, "/onboarding");
  }

  function updateProducto(i: number, patch: Partial<OnboardingProductInput>) {
    setProductos((list) => list.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function onProductImage(e: React.ChangeEvent<HTMLInputElement>, i: number) {
    const f = e.target.files?.[0];
    if (!f) return;
    updateProducto(i, { imagen: URL.createObjectURL(f) });
  }

  async function generarCatalogoIA() {
    if (negocio.descripcion.trim().length < 10) return toast.error("Completa la descripción del negocio (paso 1)");
    setAiLoading(true);
    try {
      const items = await generateCatalogFromBusiness({
        nombre_negocio: user!.nombre_negocio,
        industria: negocio.industria,
        descripcion: negocio.descripcion,
        publico_objetivo: negocio.publico,
        tono: negocio.tono as import("@/services/ai/mock").Tono,
        ciudad: negocio.ciudad,
        precio_min: precioRango.min,
        precio_max: precioRango.max,
      });
      setProductos(items.map((it) => ({
        nombre: it.nombre,
        precio: it.precio,
        descripcion: it.descripcion,
        imagen: it.imagen,
        tipo: it.tipo,
        copy_publicacion: it.copy_publicacion,
        generado_ia: true,
      })));
      setCatalogMode("manual");
      toast.success(`${items.length} productos/servicios generados — revísalos y edita lo que quieras`);
    } finally {
      setAiLoading(false);
    }
  }

  function sugerirImagenProducto(i: number) {
    const p = productos[i];
    if (!p?.nombre.trim()) return toast.error("Escribe el nombre del producto primero");
    updateProducto(i, { imagen: suggestProductImage(p.nombre, negocio.industria) });
    toast.success("Imagen sugerida por IA");
  }

  async function importarTienda() {
    const url = storeUrl.trim();
    if (!url) return toast.error("Pega el link de tu tienda");
    if (!detectStorePlatform(url)) {
      return toast.error("Link no reconocido. Usa Mercado Libre, Instagram, Facebook, TikTok Shop, Shopify o tu sitio web.");
    }
    setImportLoading(true);
    try {
      const result = await importStoreFromLink(url, {
        nombre_negocio: user!.nombre_negocio,
        industria: negocio.industria,
        tono: negocio.tono as import("@/services/ai/mock").Tono,
        ciudad: negocio.ciudad,
      });
      setProductos(result.productos.map((it) => ({
        nombre: it.nombre,
        precio: it.precio,
        descripcion: it.descripcion,
        imagen: it.imagen,
        tipo: it.tipo,
        copy_publicacion: it.copy_publicacion,
        importado_de: it.url_origen,
      })));
      setImportMeta({ platform: getStorePlatformLabel(result.platform), tienda: result.tienda_nombre });
      setCatalogMode("manual");
      toast.success(`${result.productos.length} productos importados de ${getStorePlatformLabel(result.platform)}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setImportLoading(false);
    }
  }

  function saltarAlPanel() {
    updateUser({
      onboarding_completado: true,
      industria: negocio.industria,
      tono_marca: negocio.tono,
      pago_provider_default: negocio.pago_provider,
    });
    toast.success("¡Listo! Pega links en Publicar para empezar.");
    navigate({ to: "/dashboard" });
  }

  function finalizar() {
    const validProducts = productos.filter((p) => p.nombre.trim().length >= 2 && (p.precio > 0 || p.tipo === "servicio"));
    if (validProducts.length === 0) return toast.error("Agrega al menos un producto o servicio con nombre y precio");

    bootstrapClientFromOnboarding(user!.id, {
      industria: negocio.industria,
      descripcion_negocio: negocio.descripcion,
      publico_objetivo: negocio.publico,
      tono_marca: negocio.tono,
      ciudad: negocio.ciudad,
      horario_atencion: negocio.horario,
      pago_provider: negocio.pago_provider,
      productos: validProducts,
      regla_bienvenida: automation.bienvenida,
      regla_precio: automation.precio,
      palabra_clave_precio: automation.palabra_precio,
      regla_fuera_horario: automation.fuera_horario,
    });

    updateUser({
      codigo_pais: wa.codigo,
      celular: wa.numero,
      whatsapp_configurado: true,
      onboarding_completado: true,
      industria: negocio.industria,
      descripcion_negocio: negocio.descripcion,
      publico_objetivo: negocio.publico,
      tono_marca: negocio.tono,
      ciudad: negocio.ciudad,
      horario_atencion: negocio.horario,
      pago_provider_default: negocio.pago_provider,
    });

    toast.success("¡Listo! Tu panel está activo — conecta redes y publica tu primer post 🚀");
    navigate({ to: "/dashboard" });
  }

  const conectadas = accounts.filter((a) => a.estado_conexion === "conectada").length;

  return (
    <div className="min-h-screen bg-muted/30 p-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center mb-2">
          <PubliVendeLogo size="md" />
        </div>
        <p className="text-center text-sm text-muted-foreground mb-4">
          Configuración opcional — mejora la IA. Puedes ir directo al panel y pegar links.
        </p>
        <div className="flex justify-center gap-2 mb-6">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div key={s} className={`h-1.5 w-10 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 1 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1"><Store className="w-5 h-5 text-primary" /><h1 className="text-2xl font-bold">Tu negocio (opcional)</h1></div>
            <p className="text-muted-foreground text-sm">Ayuda a la IA a adaptar mejor tus publicaciones. Puedes completarlo después en Configuración.</p>
            <div className="mt-5 space-y-3">
              <div>
                <Label>Industria</Label>
                <Select value={negocio.industria} onValueChange={(v) => setNegocio({ ...negocio, industria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RECETAS.map((r) => <SelectItem key={r.id} value={r.industria}>{r.emoji} {r.industria}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>¿Qué vendes? (descripción para la IA)</Label>
                <Textarea rows={3} value={negocio.descripcion} onChange={(e) => setNegocio({ ...negocio, descripcion: e.target.value })} placeholder="Ej: Boutique de ropa femenina, envíos a todo México, tallas S-XL…" />
              </div>
              <div>
                <Label>Cliente ideal</Label>
                <Input value={negocio.publico} onChange={(e) => setNegocio({ ...negocio, publico: e.target.value })} placeholder="Mujeres 25-40 en CDMX que compran por Instagram" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Tono de marca</Label>
                  <Select value={negocio.tono} onValueChange={(v) => setNegocio({ ...negocio, tono: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TONOS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ciudad principal</Label>
                  <Input value={negocio.ciudad} onChange={(e) => setNegocio({ ...negocio, ciudad: e.target.value })} placeholder="CDMX" />
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-6 gap-2 flex-wrap">
              <Button variant="outline" onClick={saltarAlPanel}>Ir al panel ahora</Button>
              <Button onClick={() => {
                if (negocio.descripcion.trim().length < 10) return toast.error("Describe tu negocio (mín. 10 caracteres) o usa «Ir al panel ahora»");
                setStep(2);
              }} className="bg-gradient-primary border-0">Continuar</Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6">
            <h1 className="text-2xl font-bold">Catálogo para publicar</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Todo lo que captures aquí alimenta Publicar, Productos, CRM e IA. Necesitas al menos nombre, precio e imagen (o la genera la IA).
            </p>

            <div className="flex flex-col sm:flex-row gap-2 mt-4 p-1 bg-muted rounded-lg">
              <button type="button" onClick={() => setCatalogMode("manual")} className={`flex-1 text-sm py-2 px-2 rounded-md transition ${catalogMode === "manual" ? "bg-background shadow font-medium" : "text-muted-foreground"}`}>
                Ya tengo catálogo
              </button>
              <button type="button" onClick={() => setCatalogMode("import")} className={`flex-1 text-sm py-2 px-2 rounded-md transition flex items-center justify-center gap-1 ${catalogMode === "import" ? "bg-background shadow font-medium" : "text-muted-foreground"}`}>
                <Link2 className="w-3 h-3" /> Importar tienda
              </button>
              <button type="button" onClick={() => setCatalogMode("ai")} className={`flex-1 text-sm py-2 px-2 rounded-md transition flex items-center justify-center gap-1 ${catalogMode === "ai" ? "bg-background shadow font-medium" : "text-muted-foreground"}`}>
                <Wand2 className="w-3 h-3" /> IA lo crea
              </button>
            </div>

            {catalogMode === "import" ? (
              <div className="mt-5 p-4 border border-primary/30 rounded-lg bg-primary/5 space-y-3">
                <p className="text-sm">Pega el link de tu tienda y extraemos productos, precios e imágenes para tu catálogo PubliVende.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    placeholder="https://instagram.com/tutienda o mercadolibre.com/perfil/…"
                    onKeyDown={(e) => e.key === "Enter" && importarTienda()}
                  />
                  <Button onClick={importarTienda} disabled={importLoading} variant="outline" className="shrink-0 gap-1">
                    <Link2 className="w-4 h-4" />{importLoading ? "Importando…" : "Importar"}
                  </Button>
                </div>
                <div className="text-[10px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                  <span>Soportado:</span>
                  <span>Mercado Libre</span>
                  <span>Instagram</span>
                  <span>Facebook</span>
                  <span>TikTok Shop</span>
                  <span>Shopify</span>
                  <span>Sitio web</span>
                </div>
                {importMeta && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">Origen: {importMeta.platform}</Badge>
                    <Badge variant="outline">Tienda: {importMeta.tienda}</Badge>
                  </div>
                )}
              </div>
            ) : null}

            {catalogMode === "ai" ? (
              <div className="mt-5 p-4 border border-primary/30 rounded-lg bg-primary/5 space-y-3">
                <p className="text-sm">Con tu industria y descripción, la IA propone productos/servicios con precios, fotos y copies listos para publicar.</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Precio mínimo (MXN)</Label><Input type="number" value={precioRango.min} onChange={(e) => setPrecioRango({ ...precioRango, min: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Precio máximo (MXN)</Label><Input type="number" value={precioRango.max} onChange={(e) => setPrecioRango({ ...precioRango, max: Number(e.target.value) })} /></div>
                </div>
                <Button onClick={generarCatalogoIA} disabled={aiLoading} className="w-full bg-gradient-primary border-0 gap-2">
                  <Sparkles className="w-4 h-4" />{aiLoading ? "Generando catálogo…" : "Generar catálogo con IA"}
                </Button>
              </div>
            ) : null}

            <div className="mt-5 space-y-4">
              {productos.map((p, i) => (
                <div key={i} className="p-3 border rounded-lg space-y-2 relative">
                  {productos.length > 1 && (
                    <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-7 w-7 z-10" onClick={() => setProductos(productos.filter((_, j) => j !== i))}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                  {p.generado_ia && <Badge variant="secondary" className="text-[10px]"><Sparkles className="w-3 h-3 mr-1" />Generado por IA</Badge>}
                  {p.importado_de && <Badge variant="outline" className="text-[10px]"><Link2 className="w-3 h-3 mr-1" />Importado</Badge>}
                  <div className="flex gap-3">
                    <div className="w-20 h-20 shrink-0 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
                      {p.imagen ? <img src={p.imagen} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <Button type="button" size="sm" variant="outline" className="h-8 text-xs gap-1" asChild>
                        <label className="cursor-pointer"><Upload className="w-3 h-3" /><input type="file" accept="image/*" className="hidden" onChange={(e) => onProductImage(e, i)} />Subir foto</label>
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={() => sugerirImagenProducto(i)}>
                        <Wand2 className="w-3 h-3" />IA sugiere foto
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr_120px] gap-2">
                    <div><Label>Nombre</Label><Input value={p.nombre} onChange={(e) => updateProducto(i, { nombre: e.target.value })} placeholder="Blusa floral / Consultoría 1h" /></div>
                    <div>
                      <Label>Tipo</Label>
                      <Select value={p.tipo ?? "producto"} onValueChange={(v) => updateProducto(i, { tipo: v as "producto" | "servicio" })}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="producto">Producto</SelectItem>
                          <SelectItem value="servicio">Servicio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Precio (MXN)</Label><Input type="number" min={0} value={p.precio || ""} onChange={(e) => updateProducto(i, { precio: Number(e.target.value) })} /></div>
                    <div>
                      <Label>Pasarela de pago</Label>
                      <Select value={negocio.pago_provider} onValueChange={(v) => setNegocio({ ...negocio, pago_provider: v as PagoProvider })}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stripe">Stripe</SelectItem>
                          <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                          <SelectItem value="wompi">Wompi</SelectItem>
                          <SelectItem value="payu">PayU</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Descripción (para IA y CRM)</Label><Input value={p.descripcion} onChange={(e) => updateProducto(i, { descripcion: e.target.value })} placeholder="Algodón, envío 2-3 días / Incluye diagnóstico" /></div>
                </div>
              ))}
              {productos.length < 8 && catalogMode === "manual" && (
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setProductos([...productos, { ...EMPTY_PRODUCT }])}>
                  <Plus className="w-4 h-4" /> Agregar otro
                </Button>
              )}
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="ghost" onClick={() => setStep(1)}>Atrás</Button>
              <Button onClick={() => {
                const valid = productos.filter((p) => p.nombre.trim().length >= 2 && (p.precio > 0 || p.tipo === "servicio"));
                if (!valid.length) return toast.error("Agrega al menos un producto/servicio con nombre y precio");
                const sinFoto = valid.filter((p) => !p.imagen);
                if (sinFoto.length) return toast.error("Sube una foto o usa «IA sugiere foto» en cada ítem");
                setStep(3);
              }} className="bg-gradient-primary border-0 gap-1"><Package className="w-4 h-4" />Continuar</Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-6">
            <h1 className="text-2xl font-bold">Redes sociales (opcional)</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Puedes empezar <b>solo pegando links</b> — la IA adapta el contenido, distribuye por WhatsApp y genera
              copy listo para copiar. Conecta tus cuentas <b>solo si quieres publicación automática</b> en tus perfiles.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs flex-wrap">
              <Badge variant={conectadas >= 1 ? "default" : "secondary"}>
                {conectadas}/4 conectadas
              </Badge>
              {conectadas === 0 ? (
                <span className="text-muted-foreground">Modo simple: links + IA + WhatsApp (sin OAuth)</span>
              ) : (
                <span className="text-green-700">Auto-publicación disponible en {conectadas} red{conectadas !== 1 ? "es" : ""}</span>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              {accounts.map((a) => {
                const Icon = ICONS[a.red];
                const ok = a.estado_conexion === "conectada";
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => !ok && conectar(a.red)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition ${ok ? "border-success bg-success/5" : "border-border hover:border-primary"}`}
                  >
                    <Icon className="w-6 h-6 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{RED_LABELS[a.red]}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {ok ? a.nombre_cuenta : "Opcional — toca para conectar"}
                      </div>
                    </div>
                    {ok ? <Check className="w-5 h-5 text-success" /> : <span className="text-[10px] text-primary font-medium">Conectar</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-4">
              Tip: <b>Facebook</b> conectado mejora la importación de posts de FB. Para IG, TikTok y YouTube basta con pegar el link público.
            </p>
            <div className="flex justify-between mt-6 gap-2 flex-wrap">
              <Button variant="ghost" onClick={() => setStep(2)}>Atrás</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(4)}>
                  Saltar por ahora
                </Button>
                <Button onClick={() => setStep(4)} className="bg-gradient-primary border-0">
                  {conectadas > 0 ? `Continuar (${conectadas} red${conectadas !== 1 ? "es" : ""})` : "Continuar al panel"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {step === 4 && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2"><MessageCircle className="w-6 h-6 text-whatsapp" /><h1 className="text-2xl font-bold">WhatsApp Business</h1></div>
            <p className="text-muted-foreground text-sm">El CRM usará este número para recibir clientes de tus publicaciones.</p>
            <div className="mt-6 space-y-3">
              <div><Label>Código de país</Label><Input value={wa.codigo} onChange={(e) => setWa({ ...wa, codigo: e.target.value })} /></div>
              <div><Label>Número</Label><Input value={wa.numero} onChange={(e) => setWa({ ...wa, numero: e.target.value })} /></div>
              <div><Label>Horario de atención</Label><Input value={negocio.horario} onChange={(e) => setNegocio({ ...negocio, horario: e.target.value })} /></div>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="ghost" onClick={() => setStep(3)}>Atrás</Button>
              <Button onClick={() => setStep(5)} disabled={!wa.numero} className="bg-gradient-primary border-0">Continuar</Button>
            </div>
          </Card>
        )}

        {step === 5 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1"><Bot className="w-5 h-5 text-primary" /><h1 className="text-2xl font-bold">Automatización del CRM</h1></div>
            <p className="text-muted-foreground text-sm">Estas reglas responderán solas cuando lleguen mensajes a WhatsApp.</p>
            <div className="mt-5 space-y-3">
              <div>
                <Label>Mensaje de bienvenida</Label>
                <Textarea rows={2} value={automation.bienvenida} onChange={(e) => setAutomation({ ...automation, bienvenida: e.target.value })} />
              </div>
              <div>
                <Label>Cuando escriban “precio” (o palabra clave)</Label>
                <div className="flex gap-2 mb-2">
                  <Input className="w-32" value={automation.palabra_precio} onChange={(e) => setAutomation({ ...automation, palabra_precio: e.target.value })} placeholder="precio" />
                  <span className="text-xs text-muted-foreground self-center">→ envía catálogo automático</span>
                </div>
                <Textarea rows={2} value={automation.precio} onChange={(e) => setAutomation({ ...automation, precio: e.target.value })} />
              </div>
              <div>
                <Label>Fuera de horario</Label>
                <Textarea rows={2} value={automation.fuera_horario} onChange={(e) => setAutomation({ ...automation, fuera_horario: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="ghost" onClick={() => setStep(4)}>Atrás</Button>
              <Button onClick={finalizar} className="bg-gradient-primary border-0">Activar PubliVende 🎉</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
