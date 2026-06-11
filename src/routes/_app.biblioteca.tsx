import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { loadDB, saveDB, uid } from "@/lib/mock/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/biblioteca")({ component: Biblio });

function Biblio() {
  const { user } = useAuth();
  const assets = useDB((db) => db.media_assets.filter((a) => a.user_id === user?.id));
  const [q, setQ] = useState("");

  function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const db = loadDB();
    files.forEach((f) => {
      db.media_assets.push({
        id: uid(), user_id: user!.id, nombre: f.name,
        url: URL.createObjectURL(f),
        tipo: f.type.startsWith("video") ? "video" : "imagen",
        tags: [], created_at: new Date().toISOString(),
      });
    });
    saveDB(db); toast.success(`${files.length} archivo(s) subidos`);
  }

  function eliminar(id: string) {
    const db = loadDB(); db.media_assets = db.media_assets.filter((a) => a.id !== id); saveDB(db);
  }

  const filtered = assets.filter((a) => a.nombre.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">Biblioteca</h1>
        <Button asChild className="bg-gradient-primary border-0"><label className="cursor-pointer"><Upload className="w-4 h-4 mr-1" />Subir archivos<input type="file" multiple accept="image/*,video/*" className="hidden" onChange={subir} /></label></Button>
      </div>
      <Input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      {filtered.length === 0 ? (
        <Card className="p-12 text-center"><Upload className="w-10 h-10 mx-auto text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Tu biblioteca está vacía.</p></Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((a) => (
            <Card key={a.id} className="group relative overflow-hidden">
              <img src={a.url} alt="" className="aspect-square object-cover w-full" />
              <button onClick={() => eliminar(a.id)} className="absolute top-1 right-1 bg-destructive text-white rounded p-1 opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button>
              <div className="p-2 text-xs truncate">{a.nombre}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
