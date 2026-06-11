import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { loadDB, saveDB, uid } from "@/lib/mock/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Bot } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/automatizaciones")({ component: Auto });

function Auto() {
  const { user } = useAuth();
  const reglas = useDB((db) => db.automation_rules.filter((r) => r.user_id === user?.id));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ nombre: string; disparador: "mensaje_nuevo" | "palabra_clave" | "fuera_de_horario"; palabra_clave: string; respuesta: string }>({ nombre: "", disparador: "mensaje_nuevo", palabra_clave: "", respuesta: "" });

  function toggle(id: string, activa: boolean) {
    const db = loadDB(); const r = db.automation_rules.find((x) => x.id === id); if (r) r.activa = activa; saveDB(db);
  }
  function eliminar(id: string) {
    const db = loadDB(); db.automation_rules = db.automation_rules.filter((x) => x.id !== id); saveDB(db);
    toast.success("Regla eliminada");
  }
  function crear() {
    if (!form.nombre || !form.respuesta) return toast.error("Completa los campos");
    const db = loadDB();
    db.automation_rules.push({ id: uid(), user_id: user!.id, ...form, activa: true });
    saveDB(db); setOpen(false); toast.success("Regla creada");
    setForm({ nombre: "", disparador: "mensaje_nuevo", palabra_clave: "", respuesta: "" });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold">Automatizaciones</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary border-0"><Plus className="w-4 h-4 mr-1" />Nueva regla</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Nueva regla automática</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nombre</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
              <div><Label>Disparador</Label>
                <Select value={form.disparador} onValueChange={(v) => setForm({ ...form, disparador: v as never })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensaje_nuevo">Mensaje nuevo de contacto desconocido</SelectItem>
                    <SelectItem value="palabra_clave">Contiene palabra clave</SelectItem>
                    <SelectItem value="fuera_de_horario">Fuera de horario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.disparador === "palabra_clave" && <div><Label>Palabra clave</Label><Input value={form.palabra_clave} onChange={(e) => setForm({ ...form, palabra_clave: e.target.value })} /></div>}
              <div><Label>Respuesta (usa {"{nombre}"})</Label><Textarea rows={3} value={form.respuesta} onChange={(e) => setForm({ ...form, respuesta: e.target.value })} /></div>
              {form.respuesta && (
                <div className="bg-whatsapp/10 rounded-lg p-3"><div className="text-xs text-muted-foreground mb-1">Vista previa</div>
                  <div className="bg-whatsapp text-white rounded-xl px-3 py-2 text-sm inline-block">{form.respuesta.replace("{nombre}", "Ana")}</div>
                </div>
              )}
              <Button onClick={crear} className="w-full">Crear regla</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {reglas.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Aún no tienes reglas.</Card>}
        {reglas.map((r) => (
          <Card key={r.id} className="p-4 flex items-center gap-3">
            <Bot className="w-5 h-5 text-primary" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{r.nombre}</div>
              <div className="text-xs text-muted-foreground capitalize">{r.disparador.replace("_", " ")}{r.palabra_clave && ` · "${r.palabra_clave}"`}</div>
              <div className="text-xs mt-1 truncate">{r.respuesta}</div>
            </div>
            <Switch checked={r.activa} onCheckedChange={(v) => toggle(r.id, v)} />
            <Button size="icon" variant="ghost" onClick={() => eliminar(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
