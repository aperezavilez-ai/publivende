import { useMemo } from "react";
import { analyzeHook } from "@/lib/brain/hooks";

const NIVEL_STYLE = {
  fuerte: { bar: "bg-green-500", text: "text-green-700", label: "Gancho fuerte" },
  regular: { bar: "bg-amber-500", text: "text-amber-700", label: "Gancho regular" },
  debil: { bar: "bg-red-500", text: "text-red-600", label: "Gancho débil" },
} as const;

/** Evalúa en vivo la primera línea del copy (lo que se ve antes de "ver más"). */
export function HookMeter({ copy }: { copy: string }) {
  const a = useMemo(() => analyzeHook(copy), [copy]);
  if (!copy.trim()) return null;
  const style = NIVEL_STYLE[a.nivel];

  return (
    <div className="mt-3 rounded-lg border bg-muted/40 p-2.5 text-xs space-y-1.5">
      <div className="flex items-center gap-2">
        <span className={`font-semibold ${style.text}`}>{style.label}</span>
        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${style.bar}`} style={{ width: `${a.puntaje}%` }} />
        </div>
        <span className="text-muted-foreground">{a.puntaje}/100</span>
      </div>
      {a.consejos[0] && <p className="text-muted-foreground">💡 {a.consejos[0]}</p>}
    </div>
  );
}
