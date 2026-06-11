import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { loadDB, saveDB } from "@/lib/mock/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Instagram, Facebook, Youtube, Music2, MessageCircle, Send, Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { RED_LABELS } from "@/services/social/mock";
import type { Red } from "@/lib/mock/types";
import { exportCSV, exportXLSX } from "@/lib/exporters";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_app/bandeja")({ component: Bandeja });

const ICONS: Record<Red, typeof Instagram> = { instagram: Instagram, facebook: Facebook, tiktok: Music2, youtube: Youtube };

function Bandeja() {
  const { user } = useAuth();
  const items = useDB((db) => db.inbox.filter((i) => i.user_id === user?.id));
  const contacts = useDB((db) => db.whatsapp_contacts.filter((c) => c.user_id === user?.id));
  const [red, setRed] = useState<string>("all");
  const [tipo, setTipo] = useState<string>("all");
  const [pendientes, setPendientes] = useState(false);
  const [resp, setResp] = useState<Record<string, string>>({});

  function marcarLeido(id: string, leido: boolean) {
    const db = loadDB(); const i = db.inbox.find((x) => x.id === id); if (i) i.leido = leido; saveDB(db);
  }
  function responder(id: string, redLabel: string) {
    const texto = resp[id]?.trim();
    if (!texto) return;
    const db = loadDB();
    const i = db.inbox.find((x) => x.id === id);
    if (i) {
      i.respondido = true;
      i.leido = true;
      i.respuesta = texto;
    }
    saveDB(db);
    setResp({ ...resp, [id]: "" });
    toast.success(`Respuesta enviada a ${redLabel}`);
  }

  const filtered = items
    .filter((i) => red === "all" || i.red === red)
    .filter((i) => tipo === "all" || i.tipo === tipo)
    .filter((i) => !pendientes || !i.respondido)
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));

  function buildLeadsRows() {
    return contacts.map((c) => ({
      nombre: c.nombre,
      celular: c.celular,
      etapa: c.etapa,
      etiqueta: c.etiqueta,
      origen: c.origen,
      lead_score: c.lead_score ?? "",
      monto_venta: c.monto_venta ?? "",
      no_leidos: c.no_leidos,
      fecha_creacion: c.fecha_creacion,
      notas: c.notas,
    }));
  }
  function buildInboxRows() {
    return filtered.map((i) => ({
      red: RED_LABELS[i.red],
      tipo: i.tipo,
      autor: i.autor,
      texto: i.texto,
      leido: i.leido ? "sí" : "no",
      respondido: i.respondido ? "sí" : "no",
      timestamp: i.timestamp,
    }));
  }
  function exportar(scope: "leads" | "bandeja", fmt: "csv" | "xlsx") {
    const rows: Record<string, unknown>[] = scope === "leads" ? buildLeadsRows() : buildInboxRows();
    if (!rows.length) return toast.error(scope === "leads" ? "Sin contactos para exportar" : "Sin mensajes para exportar");
    const ts = new Date().toISOString().slice(0, 10);
    const name = `publivende-${scope}-${ts}.${fmt}`;
    if (fmt === "csv") exportCSV(rows, name); else exportXLSX(rows, name, scope === "leads" ? "Leads" : "Bandeja");
    toast.success(`${rows.length} registros exportados`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Bandeja unificada</h1>
          <p className="text-sm text-muted-foreground">Comentarios y DMs de todas tus redes en un solo lugar.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" />Exportar</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">Leads / Contactos WhatsApp</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => exportar("leads", "csv")}><FileText className="w-4 h-4 mr-2" />Leads — CSV ({contacts.length})</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportar("leads", "xlsx")}><FileSpreadsheet className="w-4 h-4 mr-2" />Leads — Excel ({contacts.length})</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Bandeja (filtros aplicados)</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => exportar("bandeja", "csv")}><FileText className="w-4 h-4 mr-2" />Bandeja — CSV ({filtered.length})</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportar("bandeja", "xlsx")}><FileSpreadsheet className="w-4 h-4 mr-2" />Bandeja — Excel ({filtered.length})</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={red} onValueChange={setRed}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas las redes</SelectItem>{Object.keys(RED_LABELS).map((r) => <SelectItem key={r} value={r}>{RED_LABELS[r as Red]}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={tipo} onValueChange={setTipo}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todo</SelectItem><SelectItem value="comentario">Comentarios</SelectItem><SelectItem value="dm">DMs</SelectItem></SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm"><Switch checked={pendientes} onCheckedChange={setPendientes} />Solo pendientes</label>
      </div>
      <div className="space-y-2">
        {filtered.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Sin mensajes.</Card>}
        {filtered.map((i) => {
          const Icon = ICONS[i.red];
          return (
            <Card key={i.id} className={`p-4 ${!i.leido ? "border-primary" : ""}`}>
              <div className="flex gap-3">
                <img src={i.avatar} alt="" className="w-10 h-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <Icon className="w-3 h-3" /><span className="font-semibold">{i.autor}</span>
                    <span className="text-muted-foreground">· {i.tipo === "dm" ? <MessageCircle className="inline w-3 h-3" /> : "comentario"}</span>
                    <span className="text-muted-foreground ml-auto">{new Date(i.timestamp).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="text-sm mt-1">{i.texto}</p>
                  <div className="mt-2 flex gap-2 items-end">
                    <Textarea rows={1} placeholder="Responder…" value={resp[i.id] ?? ""} onChange={(e) => setResp({ ...resp, [i.id]: e.target.value })} className="text-sm min-h-9" />
                    <Button size="sm" onClick={() => responder(i.id, RED_LABELS[i.red])} disabled={!resp[i.id]}><Send className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => marcarLeido(i.id, !i.leido)}>{i.leido ? "No leído" : "Leído"}</Button>
                  </div>
                  {i.respondido && (
                    <div className="text-xs text-success mt-1">
                      ✓ Respondido{i.respuesta ? `: "${i.respuesta}"` : ""}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
