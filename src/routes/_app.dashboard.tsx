import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { loadDB } from "@/lib/mock/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Eye, MessageCircle, DollarSign, ArrowRight, Users, FileDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { buildFunnel } from "@/lib/attribution";
import type { Red } from "@/lib/mock/types";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

const REDES: Array<Red | "todas"> = ["todas", "instagram", "tiktok", "facebook", "youtube"];

function Dashboard() {
  const { user } = useAuth();
  const posts = useDB((db) => db.posts.filter((p) => p.user_id === user?.id));
  const metrics = useDB((db) => db.post_metrics);
  const contacts = useDB((db) => db.whatsapp_contacts.filter((c) => c.user_id === user?.id));
  const [dias, setDias] = useState<7 | 30 | 90>(30);
  const [red, setRed] = useState<Red | "todas">("todas");

  const funnel = useMemo(
    () => (user ? buildFunnel(loadDB(), user.id, { dias, red }) : null),
    // re-compute when underlying lists change too
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, dias, red, posts, metrics, contacts],
  );

  const semanas = useMemo(() => {
    const out: { semana: string; vistas: number; ventas: number }[] = [];
    const semanasTotal = dias <= 7 ? 7 : dias <= 30 ? 8 : 12;
    const span = dias <= 7 ? 86400000 : 7 * 86400000;
    for (let i = semanasTotal - 1; i >= 0; i--) {
      const start = Date.now() - (i + 1) * span;
      const end = Date.now() - i * span;
      const ps = posts.filter((p) => p.fecha_publicacion && +new Date(p.fecha_publicacion) >= start && +new Date(p.fecha_publicacion) < end);
      const ids = new Set(ps.map((p) => p.id));
      const v = metrics
        .filter((m) => ids.has(m.post_id) && (red === "todas" || m.red === red))
        .reduce((s, m) => s + m.vistas, 0);
      const ventas = contacts.filter(
        (c) => c.post_origen_id && ids.has(c.post_origen_id) && c.etapa === "ganado",
      ).reduce((s, c) => s + (c.monto_venta ?? 0), 0);
      out.push({ semana: dias <= 7 ? `D${semanasTotal - i}` : `S${semanasTotal - i}`, vistas: v, ventas });
    }
    return out;
  }, [posts, metrics, contacts, dias, red]);

  function exportarPDF() {
    if (!funnel || !user) return;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("Reporte PubliVende", 14, 18);
    doc.setFontSize(11); doc.setTextColor(120);
    doc.text(`${user.nombre_negocio} · últimos ${dias} días · red: ${red}`, 14, 26);
    doc.text(new Date().toLocaleString("es-MX"), 14, 32);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 40,
      head: [["Métrica", "Valor"]],
      body: [
        ["Vistas / alcance", funnel.vistas.toLocaleString()],
        ["Mensajes generados", funnel.mensajes.toLocaleString()],
        ["Leads (DM atribuidos)", funnel.leads.toLocaleString()],
        ["Ventas cerradas", funnel.ventas.toLocaleString()],
        ["Ingreso atribuido", `$${funnel.ingreso.toLocaleString()}`],
        ["Conv. vista → mensaje", `${funnel.conv_vista_msg}%`],
        ["Conv. mensaje → lead", `${funnel.conv_msg_lead}%`],
        ["Conv. lead → venta", `${funnel.conv_lead_venta}%`],
      ],
      theme: "grid",
      headStyles: { fillColor: [124, 58, 237] },
    });

    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
      head: [["#", "Post", "Vistas", "Msgs", "Leads", "Ventas", "Ingreso"]],
      body: funnel.top.map((r, i) => [
        i + 1,
        r.post.copy.slice(0, 42),
        r.vistas.toLocaleString(),
        r.mensajes,
        r.leads,
        r.ventas,
        `$${r.ingreso.toLocaleString()}`,
      ]),
      theme: "striped",
      headStyles: { fillColor: [236, 72, 153] },
    });

    doc.save(`reporte-publivende-${dias}d.pdf`);
    toast.success("Reporte PDF descargado");
  }

  if (!funnel) return null;

  return (
    <div className="space-y-6">
      {!user?.onboarding_completado && (
        <Card className="p-4 border-primary/30 bg-primary/5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-medium">Tip:</span> Pega links en <strong>Crear publicación</strong> para empezar ya.
            Opcional: <Link to="/onboarding" className="underline font-medium">completa tu perfil</Link> para mejores sugerencias de IA.
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/publicar">Publicar un link</Link>
          </Button>
        </Card>
      )}
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Hola, {user?.nombre.split(" ")[0]} 👋</h1>
          <p className="text-muted-foreground text-sm">Embudo end-to-end: <strong>post → DM → venta</strong>.</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={String(dias)} onValueChange={(v) => setDias(Number(v) as 7 | 30 | 90)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
          <Select value={red} onValueChange={(v) => setRed(v as Red | "todas")}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {REDES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={exportarPDF} variant="outline" className="gap-1">
            <FileDown className="w-4 h-4" />Exportar PDF
          </Button>
        </div>
      </div>

      {/* Embudo */}
      <Card className="p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Embudo de atribución</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
          <FunnelStep icon={Eye} label="Vistas" value={funnel.vistas.toLocaleString()} color="bg-blue-500" />
          <ConvBadge pct={funnel.conv_vista_msg} />
          <FunnelStep icon={MessageCircle} label="Mensajes" value={funnel.mensajes.toLocaleString()} color="bg-purple-500" />
          <ConvBadge pct={funnel.conv_msg_lead} />
          <FunnelStep icon={Users} label="Leads" value={funnel.leads.toLocaleString()} color="bg-amber-500" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
          <Card className="p-3 border-success/30">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" />Ventas cerradas</div>
            <div className="text-2xl font-bold text-success">{funnel.ventas}</div>
          </Card>
          <Card className="p-3 border-success/30">
            <div className="text-xs text-muted-foreground">Ingreso atribuido</div>
            <div className="text-2xl font-bold text-success">${funnel.ingreso.toLocaleString()}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Conv. lead → venta</div>
            <div className="text-2xl font-bold">{funnel.conv_lead_venta}%</div>
          </Card>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <h2 className="font-semibold mb-3">Vistas e ingresos por {dias <= 7 ? "día" : "semana"}</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={semanas}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="semana" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line yAxisId="left" type="monotone" dataKey="vistas" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="ventas" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-accent/40 to-card">
          <h2 className="font-semibold mb-3">Top post (atribución)</h2>
          {funnel.top[0] ? (
            <div className="space-y-3">
              <img src={funnel.top[0].post.media_url} alt="" className="w-full h-32 object-cover rounded-lg" />
              <p className="text-xs line-clamp-2 text-muted-foreground">{funnel.top[0].post.copy}</p>
              <div className="flex justify-between text-sm">
                <div><div className="text-xs text-muted-foreground">Vistas</div><div className="font-bold">{funnel.top[0].vistas.toLocaleString()}</div></div>
                <ArrowRight className="w-4 h-4 self-center text-muted-foreground" />
                <div><div className="text-xs text-muted-foreground">Msgs</div><div className="font-bold">{funnel.top[0].mensajes}</div></div>
                <ArrowRight className="w-4 h-4 self-center text-muted-foreground" />
                <div><div className="text-xs text-muted-foreground">Ventas</div><div className="font-bold text-success">{funnel.top[0].ventas}</div></div>
              </div>
              <div className="text-xs">Ingreso: <span className="font-bold text-success">${funnel.top[0].ingreso.toLocaleString()}</span></div>
            </div>
          ) : <p className="text-sm text-muted-foreground">Aún no hay publicaciones en el rango.</p>}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Top posts por ingreso atribuido</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2">Post</th>
                <th className="text-right">Vistas</th>
                <th className="text-right">Msgs</th>
                <th className="text-right">Leads</th>
                <th className="text-right">Ventas</th>
                <th className="text-right">Ingreso</th>
              </tr>
            </thead>
            <tbody>
              {funnel.top.length === 0 && <tr><td colSpan={6} className="text-center text-muted-foreground py-6">Sin datos en el rango seleccionado.</td></tr>}
              {funnel.top.map((r) => (
                <tr key={r.post.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="py-2 truncate max-w-[300px]">{r.post.copy}</td>
                  <td className="text-right">{r.vistas.toLocaleString()}</td>
                  <td className="text-right">{r.mensajes}</td>
                  <td className="text-right">{r.leads}</td>
                  <td className="text-right">{r.ventas}</td>
                  <td className="text-right font-semibold text-success">${r.ingreso.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-primary text-white">
        <div>
          <div className="font-bold text-lg">¿Listo para crear tu próximo post?</div>
          <div className="text-sm opacity-90">Publica en todas tus redes en un solo paso.</div>
        </div>
        <Link to="/publicar"><Button variant="secondary">Crear publicación</Button></Link>
      </Card>
    </div>
  );
}

function FunnelStep({ icon: Icon, label, value, color }: { icon: typeof Eye; label: string; value: string; color: string }) {
  return (
    <Card className="p-3 text-center">
      <div className={`w-10 h-10 rounded-full ${color} text-white flex items-center justify-center mx-auto mb-1`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </Card>
  );
}
function ConvBadge({ pct }: { pct: number }) {
  return (
    <div className="text-center hidden md:block">
      <ArrowRight className="w-5 h-5 mx-auto text-muted-foreground" />
      <div className="text-[10px] text-muted-foreground mt-1">{pct}%</div>
    </div>
  );
}
