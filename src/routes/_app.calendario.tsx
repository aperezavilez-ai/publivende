import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/mock/auth";
import { useDB } from "@/lib/mock/useDB";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { RED_COLORS, RED_LABELS } from "@/services/social/mock";

export const Route = createFileRoute("/_app/calendario")({ component: Calendario });

function Calendario() {
  const { user } = useAuth();
  const posts = useDB((db) => db.posts.filter((p) => p.user_id === user?.id));
  const [mes, setMes] = useState(new Date());
  const first = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const offset = first.getDay();
  const cells = Array.from({ length: offset + dias }, (_, i) => i < offset ? null : i - offset + 1);

  function postsDia(d: number) {
    return posts.filter((p) => {
      const f = p.fecha_publicacion ?? p.fecha_programada;
      if (!f) return false;
      const dt = new Date(f);
      return dt.getMonth() === mes.getMonth() && dt.getFullYear() === mes.getFullYear() && dt.getDate() === d;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Calendario</h1>
        <div className="flex gap-2 items-center">
          <button onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} className="px-3 py-1 rounded border">←</button>
          <div className="font-semibold capitalize w-40 text-center">{mes.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}</div>
          <button onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} className="px-3 py-1 rounded border">→</button>
        </div>
      </div>
      <Card className="p-3">
        <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-muted-foreground mb-2">
          {["D","L","M","M","J","V","S"].map((d, i) => <div key={i} className="text-center py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => (
            <div key={i} className="min-h-20 border rounded p-1 text-xs">
              {d && <>
                <div className="font-semibold mb-1">{d}</div>
                <div className="space-y-0.5">
                  {postsDia(d).slice(0, 3).map((p) => (
                    <div key={p.id} className="truncate px-1 py-0.5 rounded text-white text-[10px]"
                      style={{ background: RED_COLORS[p.redes_destino[0]] }} title={p.copy}>
                      {p.estado === "programado" ? "⏰" : "✓"} {RED_LABELS[p.redes_destino[0]]}
                    </div>
                  ))}
                </div>
              </>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
