import type { ContentBlock } from "@/lib/types/campaign";

export type EmailPromoTemplate = {
  enabled: boolean;
  subject: string;
  /** Simple sections rendered to HTML */
  blocks: ContentBlock[];
  showHeader: boolean;
  showFooter: boolean;
  showLogo: boolean;
  logoUrl?: string | null;
};

export function defaultEmailPromo(businessName: string): EmailPromoTemplate {
  return {
    enabled: true,
    subject: `Thanks from ${businessName}`,
    showHeader: true,
    showFooter: true,
    showLogo: true,
    blocks: [
      {
        id: "email-intro",
        type: "headline",
        order: 0,
        enabled: true,
        label: "Thanks",
        data: {
          headline: `Thanks for connecting with ${businessName}`,
          subheadline: "Here’s a little something for you.",
          alignment: "center",
        },
      },
      {
        id: "email-body",
        type: "rich_text",
        order: 1,
        enabled: true,
        label: "Body",
        data: {
          body: "Hi {{name}},\n\nWe’re glad you stopped by. Reply anytime — we’d love to hear from you.",
        },
      },
    ],
  };
}

export function parseEmailPromo(raw: unknown, businessName = "us"): EmailPromoTemplate {
  if (!raw || typeof raw !== "object") return defaultEmailPromo(businessName);
  const o = raw as Record<string, unknown>;
  const base = defaultEmailPromo(businessName);
  return {
    enabled: o.enabled !== false,
    subject: typeof o.subject === "string" ? o.subject : base.subject,
    blocks: Array.isArray(o.blocks) ? (o.blocks as ContentBlock[]) : base.blocks,
    showHeader: o.showHeader !== false,
    showFooter: o.showFooter !== false,
    showLogo: o.showLogo !== false,
    logoUrl: typeof o.logoUrl === "string" ? o.logoUrl : null,
  };
}

export function renderEmailPromoHtml(params: {
  template: EmailPromoTemplate;
  businessName: string;
  leadName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string;
  footerText?: string;
}): string {
  const { template, businessName, leadName } = params;
  const logo = template.logoUrl || params.logoUrl;
  const primary = params.primaryColor || "#22c55e";
  const name = leadName?.trim() || "there";

  const parts: string[] = [];
  parts.push(
    `<div style="font-family:ui-sans-serif,system-ui,sans-serif;line-height:1.5;color:#0f172a;max-width:560px;margin:0 auto;padding:24px">`
  );

  if (template.showHeader) {
    parts.push(
      `<div style="text-align:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #e2e8f0">`
    );
    if (template.showLogo && logo) {
      parts.push(
        `<img src="${escapeAttr(logo)}" alt="${escapeHtml(businessName)}" style="max-height:48px;max-width:160px;object-fit:contain;margin-bottom:8px" />`
      );
    }
    parts.push(
      `<div style="font-size:14px;font-weight:600;color:${primary}">${escapeHtml(businessName)}</div></div>`
    );
  }

  const blocks = [...(template.blocks || [])]
    .filter((b) => b.enabled)
    .sort((a, b) => a.order - b.order);

  for (const block of blocks) {
    const data = block.data as Record<string, unknown>;
    if (block.type === "headline") {
      const headline = String(data.headline || "").replaceAll("{{name}}", name);
      const sub = data.subheadline
        ? String(data.subheadline).replaceAll("{{name}}", name)
        : "";
      parts.push(
        `<h1 style="font-size:22px;margin:0 0 8px;text-align:${(data.alignment as string) || "left"}">${escapeHtml(headline)}</h1>`
      );
      if (sub) {
        parts.push(
          `<p style="margin:0 0 16px;color:#64748b;text-align:${(data.alignment as string) || "left"}">${escapeHtml(sub)}</p>`
        );
      }
    } else if (block.type === "rich_text") {
      const body = String(data.body || "")
        .replaceAll("{{name}}", name)
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br/>");
      parts.push(`<p style="margin:0 0 16px">${body}</p>`);
    } else if (block.type === "hero_image" && data.imageUrl) {
      const maxW = Number(data.emailMaxWidth) || Math.round(((Number(data.widthPercent) || 100) / 100) * 480);
      parts.push(
        `<div style="text-align:center;margin:0 0 16px"><img src="${escapeAttr(String(data.imageUrl))}" alt="" style="max-width:${maxW}px;width:100%;height:auto;border-radius:12px" /></div>`
      );
    } else if (block.type === "button_group") {
      const buttons = (data.buttons as { label: string; url: string }[]) ?? [];
      for (const btn of buttons) {
        parts.push(
          `<div style="margin:0 0 12px;text-align:center"><a href="${escapeAttr(btn.url)}" style="display:inline-block;background:${primary};color:#0b0f19;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">${escapeHtml(btn.label)}</a></div>`
        );
      }
    } else if (block.type === "banner") {
      parts.push(
        `<div style="background:${escapeAttr(String(data.backgroundColor || primary))};color:${escapeAttr(String(data.textColor || "#0b0f19"))};padding:14px 16px;border-radius:10px;margin:0 0 16px;text-align:center;font-weight:600">${escapeHtml(String(data.text || ""))}</div>`
      );
    } else if (block.type === "offer_coupon") {
      parts.push(
        `<div style="margin:0 0 20px;padding:20px;border-radius:14px;border:2px dashed ${primary};background:#f8fafc;text-align:center">` +
          `<div style="font-size:18px;font-weight:700;margin-bottom:6px">${escapeHtml(String(data.title || "Your offer"))}</div>` +
          (data.description
            ? `<p style="margin:0 0 12px;color:#64748b;font-size:14px">${escapeHtml(String(data.description))}</p>`
            : "") +
          (data.code
            ? `<div style="display:inline-block;font-size:22px;font-weight:800;letter-spacing:0.08em;padding:10px 18px;border-radius:10px;background:${primary};color:#0b0f19">${escapeHtml(String(data.code))}</div>`
            : "") +
          `</div>`
      );
    } else if (block.type === "spacer") {
      const h = data.height === "sm" ? 12 : data.height === "lg" ? 36 : data.height === "xl" ? 48 : 20;
      parts.push(`<div style="height:${h}px"></div>`);
    } else if (block.type === "columns") {
      const cols = (data.columns as { id: string; body: string }[]) ?? [];
      if (cols.length) {
        parts.push(
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px"><tr>` +
            cols
              .map(
                (c) =>
                  `<td valign="top" style="width:${Math.floor(100 / cols.length)}%;padding:8px;font-size:14px">${escapeHtml(c.body).replace(/\n/g, "<br/>")}</td>`
              )
              .join("") +
            `</tr></table>`
        );
      }
    }
  }

  if (template.showFooter) {
    parts.push(
      `<div style="margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center">${escapeHtml(params.footerText || `Sent by ${businessName} · Powered by Tap The Magic`)}</div>`
    );
  }

  parts.push(`</div>`);
  return parts.join("");
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
