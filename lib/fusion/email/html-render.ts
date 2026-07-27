/**
 * Email HTML renderer — theme-aware, deterministic, email-safe output.
 * Extends renderEmailPromoHtml with visual theme from Shared Visual Authoring Core.
 */

import type { EmailPromoTemplate } from "@/lib/email-promo";
import { renderEmailPromoHtml } from "@/lib/email-promo";
import type { EmailVisualTheme } from "./document";
import { htmlSafetyWarnings } from "./compatibility";

export type EmailRenderTheme = EmailVisualTheme & {
  primaryColor?: string;
};

export function renderEmailHtml(params: {
  template: EmailPromoTemplate;
  businessName: string;
  leadName?: string | null;
  logoUrl?: string | null;
  theme?: EmailRenderTheme | null;
  footerText?: string;
  darkInbox?: boolean;
  imageBlocked?: boolean;
}): string {
  const theme = params.theme ?? {};
  const primary =
    theme.ctaBackgroundColor || theme.primaryColor || params.theme?.primaryColor || "#22c55e";
  // Prefer Email background role, then content surface — preview/HTML parity with Colors drawer.
  const plate =
    theme.backgroundColor ||
    theme.contentSurfaceColor ||
    (params.darkInbox ? "#242424" : "#ffffff");
  const text = theme.headlineColor || (params.darkInbox ? "#f8fafc" : "#0f172a");
  const body = theme.bodyColor || text;
  const ctaText = theme.ctaTextColor || "#0b0f19";
  const link = theme.linkColor || primary;
  const radius = theme.borderRadius || "10px";

  const baseHtml = renderEmailPromoHtml({
    template: params.template,
    businessName: params.businessName,
    leadName: params.leadName,
    logoUrl: params.logoUrl,
    primaryColor: primary,
    footerText: params.footerText,
  });

  let html = baseHtml
    .replace(
      /max-width:560px;margin:0 auto;padding:24px/,
      `max-width:560px;margin:0 auto;padding:24px;background:${plate};color:${body}`
    )
    .replace(/color:#0f172a/g, `color:${text}`)
    .replace(/color:#64748b/g, `color:${body}`)
    .replace(
      /display:inline-block;background:[^;]+;color:#0b0f19/g,
      `display:inline-block;background:${primary};color:${ctaText}`
    )
    .replace(/border-radius:10px/g, `border-radius:${radius}`)
    .replace(/border-radius:14px/g, `border-radius:${radius}`);

  if (params.imageBlocked) {
    html = html.replace(/<img[^>]*>/gi, (match) => {
      const altMatch = match.match(/alt="([^"]*)"/i);
      const alt = altMatch?.[1] || "Image";
      return `<div style="padding:16px;background:#e2e8f0;color:#475569;text-align:center;font-size:13px;border-radius:8px;margin:0 0 16px">[${alt}]</div>`;
    });
  }

  if (params.darkInbox) {
    html = html.replace(
      /background:#f8fafc/g,
      "background:#2a2a2a"
    );
  }

  html = html.replace(/<a href="/g, `<a style="color:${link}" href="`);

  return html;
}

export function validateEmailHtml(html: string): {
  safe: boolean;
  warnings: string[];
} {
  const warnings = htmlSafetyWarnings(html);
  return { safe: warnings.length === 0, warnings };
}

export { renderEmailPromoHtml };
