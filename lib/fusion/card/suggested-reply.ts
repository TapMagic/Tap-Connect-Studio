/**
 * Deterministic suggested reply for Card-origin support threads.
 * Not live OpenAI — grounded templates + optional Brand tone.
 * Human must preview / edit / accept before send.
 */

export type SupportRequestType = "question" | "feedback" | "complaint" | "billing";

export type SuggestedReply = {
  mode: "deterministic";
  body: string;
  confidence: number;
  grounding: Array<{ source: string; detail: string }>;
  requestType: SupportRequestType;
  requiresHumanApproval: true;
  aiUnavailable: boolean;
  costVisible: false;
};

export function buildDeterministicSupportReply(input: {
  businessName: string;
  customerName?: string | null;
  question: string;
  requestType: SupportRequestType;
  brandTone?: string | null;
}): SuggestedReply {
  const name = input.customerName?.trim() || "there";
  const biz = input.businessName.trim() || "our team";
  const tone = (input.brandTone || "professional").toLowerCase();
  const warm = tone.includes("friendly") || tone.includes("warm") || tone.includes("casual");
  const greeting = warm ? `Hi ${name},` : `Hello ${name},`;
  const thanks =
    input.requestType === "feedback"
      ? `Thank you for sharing your feedback with ${biz}.`
      : input.requestType === "complaint"
        ? `Thank you for telling us about this — we take it seriously.`
        : input.requestType === "billing"
          ? `Thank you for reaching out about billing.`
          : `Thank you for your question.`;

  const ack = input.question.trim()
    ? `We received: “${truncate(input.question.trim(), 160)}”`
    : `We received your message.`;

  const next =
    input.requestType === "complaint" || input.requestType === "billing"
      ? `A teammate is reviewing this and will follow up with a concrete next step shortly.`
      : `We’ll get back to you with a clear answer as soon as we can.`;

  const signoff = warm ? `Thanks again,\n${biz}` : `Regards,\n${biz}`;

  return {
    mode: "deterministic",
    body: `${greeting}\n\n${thanks}\n\n${ack}\n\n${next}\n\n${signoff}`,
    confidence: 0.62,
    grounding: [
      { source: "request_type", detail: input.requestType },
      { source: "customer_question", detail: truncate(input.question, 200) },
      { source: "brand_tone", detail: tone },
      { source: "policy", detail: "No silent send — human approval required" },
    ],
    requestType: input.requestType,
    requiresHumanApproval: true,
    aiUnavailable: true,
    costVisible: false,
  };
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}
