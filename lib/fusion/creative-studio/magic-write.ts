/**
 * Magic Write — text rewrite scoped to selected Text targets.
 * Reuses OpenAI credentials via existing integration readiness.
 */

export type MagicWriteOperation =
  | "rewrite"
  | "shorten"
  | "expand"
  | "improve_clarity"
  | "change_tone"
  | "fix_grammar";

export type MagicWriteTarget = {
  id: string;
  text: string;
  role?: string | null;
};

export type MagicWriteRequest = {
  operation: MagicWriteOperation;
  targets: MagicWriteTarget[];
  tone?: string;
  /** When true and multiple targets, ask for coordinated set rewrite. */
  coordinated?: boolean;
};

export type MagicWriteProposal = {
  id: string;
  original: string;
  proposed: string;
  targetId: string;
};

export type MagicWriteResult =
  | { ok: true; proposals: MagicWriteProposal[]; mode: "single" | "multi" }
  | {
      ok: false;
      code: "not_configured" | "empty" | "provider_error" | "invalid";
      message: string;
    };

const OPERATION_INSTRUCTIONS: Record<MagicWriteOperation, string> = {
  rewrite: "Rewrite the copy so it feels fresher while preserving meaning and length band.",
  shorten: "Shorten the copy. Keep the core offer or message. Prefer fewer words.",
  expand: "Expand the copy slightly with one clearer benefit. Stay concise for mobile.",
  improve_clarity: "Improve clarity and specificity. Remove fluff. Keep brand-safe tone.",
  change_tone: "Rewrite in the requested tone while preserving facts and offer details.",
  fix_grammar: "Fix grammar, spelling, and punctuation. Do not change meaning.",
};

export function magicWriteSystemPrompt(operation: MagicWriteOperation, tone?: string): string {
  return [
    "You are Magic Write for Tap Connect Creative Studio.",
    "Rewrite Host-facing Card text for mobile tap pages.",
    "Return ONLY valid JSON: { \"results\": [ { \"id\": \"...\", \"text\": \"...\" } ] }",
    "Preserve each target id exactly. Do not merge unrelated blocks into one string.",
    "Keep claims plausible. Do not invent legal guarantees.",
    OPERATION_INSTRUCTIONS[operation],
    tone ? `Tone: ${tone}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildMagicWriteUserPrompt(request: MagicWriteRequest): string {
  const blocks = request.targets
    .map((target, index) => {
      const role = target.role ? ` (${target.role})` : "";
      return `${index + 1}. id=${target.id}${role}\n"""${target.text}"""`;
    })
    .join("\n\n");
  return [
    request.coordinated && request.targets.length > 1
      ? "Rewrite these related text blocks as a coordinated set. Keep each block separate."
      : "Rewrite each text block independently. Preserve each block separately.",
    "",
    blocks,
  ].join("\n");
}

export function parseMagicWriteResponse(
  raw: unknown,
  targets: MagicWriteTarget[]
): MagicWriteProposal[] {
  const obj = raw && typeof raw === "object" ? (raw as { results?: unknown }) : null;
  const results = Array.isArray(obj?.results) ? obj!.results : [];
  const byId = new Map<string, string>();
  for (const item of results) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; text?: unknown };
    if (typeof row.id === "string" && typeof row.text === "string" && row.text.trim()) {
      byId.set(row.id, row.text.trim());
    }
  }
  return targets
    .map((target) => {
      const proposed = byId.get(target.id);
      if (!proposed) return null;
      return {
        id: `mw-${target.id}`,
        targetId: target.id,
        original: target.text,
        proposed,
      } satisfies MagicWriteProposal;
    })
    .filter((item): item is MagicWriteProposal => Boolean(item));
}
