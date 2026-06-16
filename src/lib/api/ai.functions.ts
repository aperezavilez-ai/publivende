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
