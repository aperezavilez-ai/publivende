import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { loadDB, saveDB, uid, slug } from "@/lib/mock/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Sparkles, Download as DownloadIcon, Copy as CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { generarLinkCobro } from "@/lib/payments";
import { PLAN_LIMITS, type Producto } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/productos")({ component: Prods });

function Prods() {
  const { user } = useAuth();
  const productos = useDB((db) => db.productos.filter((p) => p.user_id === user?.id));
  const [open, setOpen] = useState(false);
  const [story, setStory] = useState<Producto | null>(null);
  const [form, setForm] = useState({ nombre: "", precio: 0, moneda: "MXN" as const, descripcion: "", imagen: "", link_pago: "" });

  function crear() {
    if (!user) return;
    const limit = PLAN_LIMITS[user.plan].productos;
    if (productos.length >= limit) return toast.error(`Tu plan permite máximo ${limit} productos`);
    if (!form.nombre || !form.precio) return toast.error("Nombre y precio requeridos");
    const provider = user.pago_provider_default ?? "mercadopago";
    const cobro = generarLinkCobro({
      provider,
      monto: form.precio,
      moneda: form.moneda,
      descripcion: form.nombre,
    });
    const db = loadDB();
    db.productos.push({
      id: uid(),
      user_id: user.id,
      nombre: form.nombre,
      precio: form.precio,
      moneda: form.moneda,
      descripcion: form.descripcion,
      imagen: form.imagen,
      link_pago: form.link_pago || cobro.url,
      pago_provider: provider,
      slug_publico: slug() + "-" + form.nombre.toLowerCase().replace(/\s+/g, "-"),
      activo: true,
    });
    saveDB(db);
    setOpen(false);
    setForm({ nombre: "", precio: 0, moneda: "MXN", descripcion: "", imagen: "", link_pago: "" });
    toast.success("Producto creado");
  }
  function toggle(id: string) {
    const db = loadDB(); const p = db.productos.find((x) => x.id === id); if (p) p.activo = !p.activo; saveDB(db);
  }
  function eliminar(id: string) {
    const db = loadDB(); db.productos = db.productos.filter((p) => p.id !== id); saveDB(db);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold">Catálogo de productos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary border-0"><Plus className="w-4 h-4 mr-1" />Nuevo producto</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Nuevo producto</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nombre</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Precio</Label><Input type="number" value={form.precio} onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })} /></div>
                <div><Label>Moneda</Label>
                  <Select value={form.moneda} onValueChange={(v) => setForm({ ...form, moneda: v as never })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["MXN","COP","ARS","CLP","USD"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Descripción</Label><Textarea rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
              <div><Label>URL imagen</Label><Input value={form.imagen} onChange={(e) => setForm({ ...form, imagen: e.target.value })} /></div>
              <div><Label>Link de pago</Label><Input value={form.link_pago} onChange={(e) => setForm({ ...form, link_pago: e.target.value })} placeholder="https://mpago.la/…" /></div>
              <Button onClick={crear} className="w-full">Crear</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {productos.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground col-span-full">Sin productos.</Card>}
        {productos.map((p) => (
          <Card key={p.id} className={`p-3 ${!p.activo ? "opacity-60" : ""}`}>
            {p.imagen && <img src={p.imagen} alt="" className="aspect-video object-cover rounded mb-2 w-full" />}
            <div className="font-semibold">{p.nombre}</div>
            <div className="text-lg font-bold text-primary">${p.precio} <span className="text-xs text-muted-foreground">{p.moneda}</span></div>
            <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.descripcion}</div>
            {p.slug_publico && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs mt-1 px-0"
                onClick={() => {
                  const url = `${window.location.origin}/tienda/${p.slug_publico}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Link de tienda copiado");
                }}
              >
                Copiar link tienda
              </Button>
            )}
            <div className="flex items-center justify-between mt-3 gap-1">
              <label className="flex items-center gap-2 text-xs"><Switch checked={p.activo} onCheckedChange={() => toggle(p.id)} />Activo</label>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setStory(p)}>
                  <Sparkles className="w-3 h-3" />Story
                </Button>
                <Button size="icon" variant="ghost" onClick={() => eliminar(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <StoryDialog producto={story} celular={user?.celular ?? ""} codigoPais={user?.codigo_pais ?? "+52"} onClose={() => setStory(null)} />
    </div>
  );
}

interface StoryConfig {
  plantilla: "minimal" | "bold" | "promo" | "soft";
  textoTop: string;
  textoCTA: string;
  bg1: string;
  bg2: string;
  textColor: string;
  acentoColor: string;
  logoUrl: string;
}

const PLANTILLAS: Record<StoryConfig["plantilla"], Partial<StoryConfig>> = {
  minimal: { bg1: "#0f172a", bg2: "#1e293b", textColor: "#ffffff", acentoColor: "#fde047" },
  bold:    { bg1: "#7c3aed", bg2: "#ec4899", textColor: "#ffffff", acentoColor: "#fde047" },
  promo:   { bg1: "#dc2626", bg2: "#f59e0b", textColor: "#ffffff", acentoColor: "#fef9c3" },
  soft:    { bg1: "#fce7f3", bg2: "#e0e7ff", textColor: "#1e293b", acentoColor: "#7c3aed" },
};

function defaultConfig(): StoryConfig {
  return {
    plantilla: "bold",
    textoTop: "🛍️ OFERTA DEL DÍA",
    textoCTA: "👉 Escríbenos al WhatsApp",
    ...PLANTILLAS.bold,
    logoUrl: "/logo-publivende.png",
  } as StoryConfig;
}

function StoryDialog({ producto, celular, codigoPais, onClose }: { producto: Producto | null; celular: string; codigoPais: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cfg, setCfg] = useState<StoryConfig>(defaultConfig());

  const waMsg = producto ? `Hola! Me interesa *${producto.nombre}* (SKU ${producto.id.slice(0, 6)}) — $${producto.precio} ${producto.moneda}` : "";
  const waLink = useMemo(
    () => `https://wa.me/${(codigoPais + celular).replace(/\D/g, "")}?text=${encodeURIComponent(waMsg)}`,
    [codigoPais, celular, waMsg],
  );

  // Cargar configuración previa por producto
  useEffect(() => {
    if (!producto) return;
    try {
      const raw = localStorage.getItem(`story:${producto.id}`);
      setCfg(raw ? { ...defaultConfig(), ...JSON.parse(raw) } : defaultConfig());
    } catch { setCfg(defaultConfig()); }
  }, [producto]);

  function aplicarPlantilla(p: StoryConfig["plantilla"]) {
    setCfg((c) => ({ ...c, plantilla: p, ...PLANTILLAS[p] }) as StoryConfig);
  }

  function subirLogo(file: File) {
    const reader = new FileReader();
    reader.onloadend = () => setCfg((c) => ({ ...c, logoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  }

  // Render canvas
  useEffect(() => {
    if (!producto) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 1080; canvas.height = 1920;

    const draw = (prodImg: HTMLImageElement | null, logoImg: HTMLImageElement | null) => {
      // Fondo gradiente
      const grad = ctx.createLinearGradient(0, 0, 0, 1920);
      grad.addColorStop(0, cfg.bg1); grad.addColorStop(1, cfg.bg2);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 1080, 1920);

      // Decoración sutil
      ctx.fillStyle = cfg.acentoColor + "22";
      ctx.beginPath(); ctx.arc(900, 200, 220, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(150, 1750, 280, 0, Math.PI * 2); ctx.fill();

      // Texto superior
      ctx.fillStyle = cfg.textColor;
      ctx.font = "bold 56px system-ui, -apple-system, Helvetica, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(cfg.textoTop.slice(0, 28), 80, 240);

      // Logo
      if (logoImg) {
        ctx.drawImage(logoImg, 880, 100, 140, 140);
      }

      // Imagen producto (cuadro 920x920 centrado)
      const PX = 80, PY = 320, PS = 920;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      roundRect(ctx, PX, PY, PS, PS, 32); ctx.fill();
      ctx.restore();
      if (prodImg) {
        ctx.save();
        roundRect(ctx, PX, PY, PS, PS, 32); ctx.clip();
        // cover
        const r = Math.max(PS / prodImg.width, PS / prodImg.height);
        const w = prodImg.width * r, h = prodImg.height * r;
        ctx.drawImage(prodImg, PX + (PS - w) / 2, PY + (PS - h) / 2, w, h);
        ctx.restore();
      }

      // Nombre producto
      ctx.fillStyle = cfg.textColor;
      ctx.font = "bold 76px system-ui, -apple-system, Helvetica, sans-serif";
      wrap(ctx, producto.nombre, 80, 1380, 920, 90);

      // Precio
      ctx.fillStyle = cfg.acentoColor;
      ctx.font = "900 130px system-ui, -apple-system, Helvetica, sans-serif";
      ctx.fillText(`$${producto.precio} ${producto.moneda}`, 80, 1620);

      // CTA en pill
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      roundRect(ctx, 80, 1700, 920, 110, 55); ctx.fill();
      ctx.fillStyle = cfg.textColor;
      ctx.font = "bold 42px system-ui, -apple-system, Helvetica, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(cfg.textoCTA.slice(0, 36), 540, 1770);

      // Footer celular
      ctx.font = "32px system-ui, -apple-system, Helvetica, sans-serif";
      ctx.fillStyle = cfg.textColor + "cc";
      ctx.fillText(`💬 ${codigoPais} ${celular}`, 540, 1870);
      ctx.textAlign = "left";
    };

    const tryLoad = (url: string) =>
      new Promise<HTMLImageElement | null>((resolve) => {
        if (!url) return resolve(null);
        const img = new Image(); img.crossOrigin = "anonymous";
        img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = url;
      });

    Promise.all([tryLoad(producto.imagen), tryLoad(cfg.logoUrl)]).then(([p, l]) => draw(p, l));
  }, [producto, cfg, codigoPais, celular]);

  function descargar() {
    const c = canvasRef.current; if (!c || !producto) return;
    try {
      const a = document.createElement("a");
      a.href = c.toDataURL("image/png"); a.download = `story-${producto.nombre.replace(/\s+/g, "-")}.png`;
      a.click();
      localStorage.setItem(`story:${producto.id}`, JSON.stringify(cfg));
      toast.success("Story descargada — súbela a Instagram/TikTok");
    } catch {
      toast.error("La imagen del producto bloquea la descarga por CORS. Usa una imagen propia o sin imagen.");
    }
  }

  return (
    <Dialog open={!!producto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Tienda en historia — {producto?.nombre}</DialogTitle></DialogHeader>
        {producto && (
          <div className="grid md:grid-cols-[1fr_280px] gap-4">
            <canvas ref={canvasRef} className="w-full rounded-lg border bg-muted" style={{ aspectRatio: "9/16" }} />
            <div className="space-y-3 text-sm">
              <div>
                <Label className="text-xs">Plantilla</Label>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {(Object.keys(PLANTILLAS) as Array<StoryConfig["plantilla"]>).map((p) => (
                    <button key={p} onClick={() => aplicarPlantilla(p)}
                      className={`h-10 rounded border-2 text-xs font-semibold capitalize ${cfg.plantilla === p ? "border-primary" : "border-border"}`}
                      style={{ background: `linear-gradient(135deg, ${PLANTILLAS[p].bg1}, ${PLANTILLAS[p].bg2})`, color: PLANTILLAS[p].textColor }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Texto superior</Label>
                <Input value={cfg.textoTop} maxLength={28} onChange={(e) => setCfg({ ...cfg, textoTop: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">CTA inferior</Label>
                <Input value={cfg.textoCTA} maxLength={36} onChange={(e) => setCfg({ ...cfg, textoCTA: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Color top</Label><Input type="color" value={cfg.bg1} onChange={(e) => setCfg({ ...cfg, bg1: e.target.value })} /></div>
                <div><Label className="text-xs">Color bottom</Label><Input type="color" value={cfg.bg2} onChange={(e) => setCfg({ ...cfg, bg2: e.target.value })} /></div>
                <div><Label className="text-xs">Texto</Label><Input type="color" value={cfg.textColor} onChange={(e) => setCfg({ ...cfg, textColor: e.target.value })} /></div>
                <div><Label className="text-xs">Acento</Label><Input type="color" value={cfg.acentoColor} onChange={(e) => setCfg({ ...cfg, acentoColor: e.target.value })} /></div>
              </div>
              <div>
                <Label className="text-xs">Logo (opcional)</Label>
                <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && subirLogo(e.target.files[0])} />
                {cfg.logoUrl && <Button variant="ghost" size="sm" className="h-7 text-xs mt-1" onClick={() => setCfg({ ...cfg, logoUrl: "" })}>Quitar logo</Button>}
              </div>
              <div className="text-xs bg-muted p-2 rounded">
                <div className="font-semibold mb-1">Link WhatsApp:</div>
                <div className="truncate text-muted-foreground">{waLink}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={descargar} className="flex-1 gap-1"><DownloadIcon className="w-4 h-4" />Descargar</Button>
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(waLink); toast.success("Link copiado"); }}>
                  <CopyIcon className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Tu configuración se guarda por producto al descargar.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      yy += lh;
      line = w;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}
