import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Sparkles, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { setPublishDraft } from "@/lib/draft";
import { RED_LABELS } from "@/services/social/mock";
import type { Red } from "@/lib/mock/types";

export const Route = createFileRoute("/_app/analiticas")({ component: Analiticas });

function Analiticas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const posts = useDB((db) => db.posts.filter((p) => p.user_id === user?.id && p.estado === "publicado"));
  const metrics = useDB((db) => db.post_metrics);
  const contacts = useDB((db) => db.whatsapp_contacts.filter((c) => c.user_id === user?.id));

  const porRed: Record<Red, number> = { facebook: 0, instagram: 0, tiktok: 0, youtube: 0 };
  metrics.forEach((m) => { if (posts.find((p) => p.id === m.post_id)) porRed[m.red] += m.vistas; });
  const chartData = Object.entries(porRed).map(([red, vistas]) => ({ red: RED_LABELS[red as Red], vistas }));

  const ranked = posts.map((p) => {
    const m = metrics.filter((x) => x.post_id === p.id);
    const vistas = m.reduce((s, x) => s + x.vistas, 0);
    const cs = contacts.filter((c) => c.post_origen_id === p.id);
    const ganadas = cs.filter((c) => c.etapa === "ganado");
    const ingresos = ganadas.reduce((s, c) => s + (c.monto_venta ?? 0), 0);
    return { p, vistas, msgs: cs.length, ventas: ganadas.length, ingresos };
  }).sort((a, b) => b.vistas - a.vistas);

  const totalVistas = ranked.reduce((s, x) => s + x.vistas, 0);
  const totalMsgs = ranked.reduce((s, x) => s + x.msgs, 0);
  const totalLeads = contacts.filter((c) => c.etapa === "negociando" || c.etapa === "ganado").length;
  const totalIngresos = ranked.reduce((s, x) => s + x.ingresos, 0);

  async function descargarQR(slug: string) {
    const url = `https://wa.me/${user!.codigo_pais.replace("+","")}${user!.celular}?text=${encodeURIComponent(`Hola, vi tu post (${slug})`)}`;
    const dataUrl = await QRCode.toDataURL(url);
    const a = document.createElement("a"); a.href = dataUrl; a.download = `qr-${slug}.png`; a.click();
    toast.success("QR descargado");
  }

  const reciclables = ranked.filter((r) => r.p.fecha_publicacion && Date.now() - +new Date(r.p.fecha_publicacion) > 30 * 86400000);
  const promedio = totalVistas / (ranked.length || 1);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold">Analíticas</h1>
      <Tabs defaultValue="general">
        <TabsList><TabsTrigger value="general">General</TabsTrigger><TabsTrigger value="atribucion">Atribución a ventas</TabsTrigger><TabsTrigger value="reciclar">Reciclador IA</TabsTrigger></TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Vistas por red</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="red" /><YAxis /><Tooltip /><Bar dataKey="vistas" fill="hsl(var(--primary))" radius={[8,8,0,0]} /></BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-5"><h2 className="font-semibold mb-3">Top publicaciones</h2>
            <div className="space-y-2 text-sm">
              {ranked.slice(0, 10).map((r) => (
                <div key={r.p.id} className="flex items-center gap-3 border-b pb-2">
                  <img src={r.p.media_url} className="w-12 h-12 rounded object-cover" alt="" />
                  <div className="flex-1 truncate">{r.p.copy}</div>
                  <div className="text-right text-xs"><div className="font-bold">{r.vistas.toLocaleString()} vistas</div><div className="text-muted-foreground">{r.msgs} msgs</div></div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="atribucion" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[{l:"Vistas",v:totalVistas.toLocaleString()},{l:"Mensajes",v:totalMsgs},{l:"Leads",v:totalLeads},{l:"Ingresos",v:`$${totalIngresos.toLocaleString()}`}].map((k) => (
              <Card key={k.l} className="p-4"><div className="text-xs text-muted-foreground">{k.l}</div><div className="text-xl font-bold mt-1">{k.v}</div></Card>
            ))}
          </div>
          <Card className="p-5"><h2 className="font-semibold mb-3">Top posts por ingresos</h2>
            <div className="space-y-2 text-sm">
              {ranked.filter((r) => r.ingresos > 0).slice(0, 10).map((r) => (
                <div key={r.p.id} className="flex items-center gap-3 border-b pb-2">
                  <img src={r.p.media_url} className="w-12 h-12 rounded object-cover" alt="" />
                  <div className="flex-1 min-w-0"><div className="truncate">{r.p.copy}</div><div className="text-xs text-muted-foreground">{r.ventas} ventas · {r.msgs} mensajes</div></div>
                  <div className="font-bold text-success">${r.ingresos.toLocaleString()}</div>
                  <Button size="icon" variant="outline" onClick={() => descargarQR(r.p.tracking_slug)}><QrCode className="w-4 h-4" /></Button>
                </div>
              ))}
              {ranked.filter((r) => r.ingresos > 0).length === 0 && <p className="text-muted-foreground py-4 text-center">Aún no hay ventas atribuidas.</p>}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reciclar" className="space-y-3">
          <p className="text-sm text-muted-foreground">Posts con +30 días que funcionaron bien. Reciclalos con un toque IA.</p>
          {reciclables.map((r) => {
            const top = r.vistas > promedio * 1.3;
            return (
              <Card key={r.p.id} className="p-4 flex items-center gap-3">
                <img src={r.p.media_url} className="w-16 h-16 rounded object-cover" alt="" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{r.p.copy}</div>
                  <div className="text-xs text-muted-foreground">{r.vistas} vistas {top && <span className="text-amber-500 font-semibold ml-1">🔥 Top performer</span>}</div>
                </div>
                <Button size="sm" onClick={() => {
                  setPublishDraft({
                    copy: r.p.copy,
                    media: r.p.media_url,
                    idea: `Reciclar post top: ${r.p.copy.slice(0, 80)}`,
                    openIa: true,
                  });
                  navigate({ to: "/publicar" });
                  toast.success("Post cargado para reciclar con IA");
                }} className="bg-gradient-primary border-0 gap-1"><Sparkles className="w-3 h-3" />Reciclar con IA</Button>
              </Card>
            );
          })}
          {reciclables.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Aún no tienes posts con suficiente antigüedad.</Card>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
