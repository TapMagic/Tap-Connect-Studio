/**
 * Safe inbound email normalization — untrusted content.
 */

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
]);

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_BODY_CHARS = 100_000;

export type AttachmentMeta = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  allowed: boolean;
  rejectReason?: string;
};

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Persist-safe HTML reference: never store active scripts/handlers */
export function sanitizeHtmlForStorage(html: string | null | undefined): string | null {
  if (!html) return null;
  let out = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "");
  if (out.length > MAX_BODY_CHARS) out = out.slice(0, MAX_BODY_CHARS);
  return out;
}

export function normalizePlainText(text: string | null | undefined): string {
  if (!text) return "";
  let t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Trim quoted reply threads (best-effort, safe)
  const lines = t.split("\n");
  const cutPatterns = [
    /^On .+ wrote:$/i,
    /^-{2,}\s*Original Message\s*-{2,}$/i,
    /^From:\s.+$/i,
    /^Sent from my iPhone$/i,
  ];
  let cutAt = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (cutPatterns.some((re) => re.test(lines[i].trim()))) {
      cutAt = i;
      break;
    }
    if (lines[i].startsWith(">")) {
      // keep going; trim contiguous quote block at end later
    }
  }
  t = lines.slice(0, cutAt).join("\n");
  // Drop trailing quote block
  const trimmedLines = t.split("\n");
  while (trimmedLines.length && trimmedLines[trimmedLines.length - 1].startsWith(">")) {
    trimmedLines.pop();
  }
  t = trimmedLines.join("\n").trim();
  if (t.length > MAX_BODY_CHARS) t = t.slice(0, MAX_BODY_CHARS);
  return t;
}

export function normalizeInboundBody(input: {
  text?: string | null;
  html?: string | null;
}): { normalizedText: string; sanitizedHtml: string | null } {
  const fromText = normalizePlainText(input.text);
  const sanitizedHtml = sanitizeHtmlForStorage(input.html);
  const fromHtml = sanitizedHtml ? stripHtmlToText(sanitizedHtml) : "";
  const normalizedText = fromText || normalizePlainText(fromHtml);
  return { normalizedText, sanitizedHtml };
}

export function evaluateAttachmentMeta(input: {
  id: string;
  filename?: string | null;
  contentType?: string | null;
  size?: number | null;
}): AttachmentMeta {
  const filename = (input.filename ?? "attachment").slice(0, 200);
  const contentType = (input.contentType ?? "application/octet-stream").toLowerCase();
  const size = input.size ?? 0;
  if (size > MAX_ATTACHMENT_BYTES) {
    return {
      id: input.id,
      filename,
      contentType,
      size,
      allowed: false,
      rejectReason: "Attachment exceeds size limit.",
    };
  }
  if (!ALLOWED_ATTACHMENT_TYPES.has(contentType)) {
    return {
      id: input.id,
      filename,
      contentType,
      size,
      allowed: false,
      rejectReason: "Attachment type is not allowed.",
    };
  }
  return { id: input.id, filename, contentType, size, allowed: true };
}

/**
 * Autopilot / automation must never treat inbound body as trusted commands.
 * Detect common injection-style phrases for boundary tests — never execute.
 */
export function detectUntrustedOperationalInstructions(text: string): {
  containsInstructions: boolean;
  matched: string[];
} {
  const patterns: Array<{ label: string; re: RegExp }> = [
    { label: "refund", re: /\b(issue|process|approve)\s+(a\s+)?refund\b/i },
    { label: "export_data", re: /\b(export|download)\s+(all\s+)?(customer|user)?\s*data\b/i },
    { label: "change_credentials", re: /\b(reset|change)\s+(the\s+)?(password|api\s*key|credentials)\b/i },
    { label: "consent_change", re: /\b(opt[\s-]?in|grant\s+consent|revoke\s+consent)\b/i },
    { label: "destructive", re: /\b(delete\s+account|drop\s+table|wipe\s+database)\b/i },
    { label: "external_send", re: /\b(send\s+this\s+to\s+everyone|blast\s+the\s+list)\b/i },
  ];
  const matched = patterns.filter((p) => p.re.test(text)).map((p) => p.label);
  return { containsInstructions: matched.length > 0, matched };
}

/** Autopilot may summarize/classify/recommend — never execute */
export function autopilotMayExecuteEmailInstructions(): false {
  return false;
}

export function normalizeHeaderValue(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 998);
}
