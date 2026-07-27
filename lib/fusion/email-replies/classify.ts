/**
 * Simple V1 reply classification — categories only, no nested rules engine.
 */

import type { ReplyMessageCategory } from "./types";

export type ClassificationResult = {
  category: ReplyMessageCategory;
  urgency: "low" | "normal" | "high";
  confidence: number;
};

export function classifyReplyText(text: string): ClassificationResult {
  const t = text.toLowerCase();

  const complaint =
    /\b(complaint|refund|angry|terrible|worst|lawsuit|attorney|never again|scam|ripoff|rip-off)\b/.test(
      t
    ) || /\b(manager|unacceptable|disgusted)\b/.test(t);
  const booking =
    /\b(book|booking|appointment|reserv|schedule|availability|available)\b/.test(t);
  const sales =
    /\b(price|pricing|quote|buy|purchase|demo|enterprise|proposal|interested in)\b/.test(
      t
    );
  const question =
    /\b(how|what|when|where|why|who|can you|could you|please explain|info|information|\?)\b/.test(
      t
    );

  let category: ReplyMessageCategory = "other";
  let confidence = 0.4;
  if (complaint) {
    category = "complaints";
    confidence = 0.75;
  } else if (booking) {
    category = "bookings";
    confidence = 0.7;
  } else if (sales) {
    category = "sales";
    confidence = 0.65;
  } else if (question) {
    category = "questions";
    confidence = 0.6;
  }

  const urgency: ClassificationResult["urgency"] = complaint
    ? "high"
    : booking
      ? "normal"
      : "low";

  return { category, urgency, confidence };
}
