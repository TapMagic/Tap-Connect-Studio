import OpenAI from "openai";
import { isAiReady } from "@/lib/config/integrations";
import {
  buildMagicWriteUserPrompt,
  magicWriteSystemPrompt,
  parseMagicWriteResponse,
  type MagicWriteRequest,
  type MagicWriteResult,
} from "@/lib/fusion/creative-studio/magic-write";

export async function runMagicWrite(request: MagicWriteRequest): Promise<MagicWriteResult> {
  const targets = (request.targets || []).filter((target) => target.id && typeof target.text === "string");
  if (!targets.length) {
    return { ok: false, code: "empty", message: "Select text to rewrite." };
  }
  if (!isAiReady()) {
    return {
      ok: false,
      code: "not_configured",
      message: "AI provider is not configured. Add OPENAI_API_KEY to enable Magic Write.",
    };
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: request.operation === "fix_grammar" ? 0.2 : 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: magicWriteSystemPrompt(request.operation, request.tone) },
        { role: "user", content: buildMagicWriteUserPrompt({ ...request, targets }) },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { ok: false, code: "provider_error", message: "The AI provider returned an empty response." };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { ok: false, code: "provider_error", message: "The AI provider returned invalid JSON." };
    }
    const proposals = parseMagicWriteResponse(parsed, targets);
    if (!proposals.length) {
      return { ok: false, code: "provider_error", message: "No usable rewrite was returned. Try again." };
    }
    return {
      ok: true,
      proposals,
      mode: targets.length > 1 ? "multi" : "single",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Magic Write request failed.";
    return { ok: false, code: "provider_error", message };
  }
}
