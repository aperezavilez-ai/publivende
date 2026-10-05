import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isRealAIEnabled } from "@/server/config";
import { generateCaptionsOpenAI } from "@/server/ai/openai";

export const generateCaptionsAI = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      idea: z.string(),
      tono: z.string(),
      industria: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isRealAIEnabled()) {
      return { ok: false as const, useLocal: true };
    }
    const captions = await generateCaptionsOpenAI({
      idea: data.idea,
      tono: data.tono,
      industria: data.industria,
    });
    return { ok: true as const, captions };
  });

export const adaptMultiNetworkAI = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      sourceCaption: z.string(),
      title: z.string().optional(),
      redes: z.array(z.enum(["facebook", "instagram", "tiktok", "youtube"])),
      industria: z.string().optional(),
      tono: z.string().optional(),
      negocio: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isRealAIEnabled()) {
      return { ok: false as const, error: "IA no configurada" };
    }
    const { adaptMultiNetworkWithAI } = await import("@/server/ai/openai");
    const result = await adaptMultiNetworkWithAI({
      sourceCaption: data.sourceCaption,
      title: data.title,
      redes: data.redes,
      industria: data.industria,
      tono: data.tono,
      negocio: data.negocio,
    });
    return { ok: true as const, result };
  });

