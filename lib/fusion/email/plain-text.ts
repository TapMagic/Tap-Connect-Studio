/**
 * Deterministic plain-text generation for Email documents.
 */

import type { ContentBlock } from "@/lib/types/campaign";
import type { EmailDocument } from "./document";
import { emailDocumentBlocks } from "./document";

function personalize(text: string, name: string): string {
  return text.replaceAll("{{name}}", name);
}

function blockToPlain(block: ContentBlock, name: string): string[] {
  const data = block.data as Record<string, unknown>;
  const lines: string[] = [];

  switch (block.type) {
    case "creative_section": {
      const document =
        data.document && typeof data.document === "object"
          ? (data.document as {
              nodes?: { primitive?: string; props?: Record<string, unknown> }[];
            })
          : null;
      for (const node of document?.nodes || []) {
        if (node.primitive === "text" && node.props?.text) {
          lines.push(personalize(String(node.props.text), name));
        } else if (node.primitive === "image" && node.props?.alt) {
          lines.push(`[${String(node.props.alt)}]`);
        } else if (node.primitive === "button" && node.props?.label) {
          lines.push(
            `${String(node.props.label)}${
              node.props.url ? `: ${String(node.props.url)}` : ""
            }`
          );
        }
      }
      break;
    }
    case "creative_flow": {
      if (data.heading) lines.push(personalize(String(data.heading), name));
      if (data.body) lines.push(personalize(String(data.body), name));
      break;
    }
    case "headline": {
      const headline = personalize(String(data.headline || ""), name);
      const sub = data.subheadline
        ? personalize(String(data.subheadline), name)
        : "";
      if (headline) lines.push(headline);
      if (sub) lines.push(sub);
      break;
    }
    case "rich_text": {
      const body = personalize(String(data.body || ""), name);
      if (body) lines.push(...body.split("\n").filter(Boolean));
      break;
    }
    case "hero_image": {
      const alt = String(data.altText || data.imageAlt || "Image");
      const url = String(data.imageUrl || data.linkUrl || "");
      if (url) lines.push(`[${alt}: ${url}]`);
      else if (alt) lines.push(`[${alt}]`);
      break;
    }
    case "button_group": {
      const buttons =
        (data.buttons as { label: string; url: string }[]) ?? [];
      for (const btn of buttons) {
        if (btn.label && btn.url) lines.push(`${btn.label}: ${btn.url}`);
      }
      break;
    }
    case "banner": {
      const text = String(data.text || "");
      if (text) lines.push(text);
      break;
    }
    case "offer_coupon": {
      const title = String(data.title || "Your offer");
      const desc = String(data.description || "");
      const code = data.code ? String(data.code) : "";
      lines.push(title);
      if (desc) lines.push(desc);
      if (code) lines.push(`Code: ${code}`);
      const cta = String(data.ctaLabel || "");
      if (cta) lines.push(cta);
      break;
    }
    case "columns": {
      const cols = (data.columns as { body: string }[]) ?? [];
      for (const col of cols) {
        if (col.body) lines.push(...col.body.split("\n").filter(Boolean));
      }
      break;
    }
    case "spacer":
      break;
    default:
      break;
  }
  return lines;
}

export function renderEmailPlainText(params: {
  document: EmailDocument;
  businessName: string;
  leadName?: string | null;
  footerText?: string;
}): string {
  const { document, businessName, leadName } = params;
  const name = leadName?.trim() || "there";
  const blocks = emailDocumentBlocks(document);
  const parts: string[] = [];

  if (document.subject?.trim()) {
    parts.push(`Subject: ${document.subject.trim()}`);
    parts.push("");
  }

  for (const block of blocks) {
    const lines = blockToPlain(block, name);
    if (lines.length) {
      parts.push(...lines);
      parts.push("");
    }
  }

  parts.push(`— ${businessName}`);
  parts.push(
    params.footerText ||
      "Unsubscribe: [unsubscribe link will appear when sending is enabled]"
  );

  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function resolvePlainTextForDocument(
  document: EmailDocument,
  businessName: string
): { text: string; stale: boolean; source: "override" | "generated" } {
  if (document.plainTextOverride?.trim()) {
    return {
      text: document.plainTextOverride.trim(),
      stale: document.plainTextStale === true,
      source: "override",
    };
  }
  const generated = renderEmailPlainText({ document, businessName });
  return { text: generated, stale: false, source: "generated" };
}

export function markPlainTextStale(document: EmailDocument): EmailDocument {
  if (!document.plainTextOverride) return document;
  return { ...document, plainTextStale: true };
}

export function subjectPreheaderGuidance(subject: string, preheader: string): string[] {
  const tips: string[] = [];
  if (subject.length > 60) {
    tips.push("Subject may truncate on mobile — keep the key message in the first 40 characters.");
  }
  if (!preheader.trim()) {
    tips.push("Adding a preheader improves open rates — inbox clients show it after the subject.");
  }
  if (preheader.length > 100) {
    tips.push("Preheader may truncate — lead with the most important words.");
  }
  return tips;
}
