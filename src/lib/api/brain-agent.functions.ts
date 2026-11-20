import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { executeBrainAgent, type BrainAgentOutput } from "@/server/agent/brain";

export const analizarConCerebroIA = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      copy: z.string().min(1),
      pageName: z.string().optional(),
      mediaUrl: z.string().optional(),
      ciudad: z.string().optional(),
      estado: z.string().optional(),
      alcanceNivel: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true; brain: BrainAgentOutput } | { ok: false; error: string }> => {
    try {
      const output = await executeBrainAgent(data);
      return { ok: true, brain: output };
    } catch (err) {
      console.error("Error en analizarConCerebroIA:", err);
      return { ok: false, error: err instanceof Error ? err.message : "Error al procesar con el Cerebro de PubliVende" };
    }
  });
