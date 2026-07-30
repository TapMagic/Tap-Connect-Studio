import {
  creativeFlowSectionSchema,
  creativeRenderDocumentSchema,
} from "@/lib/fusion/creative-platform/model";
import { gradientToCss } from "@/lib/fusion/creative-studio/gradient";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : fallback;
}

export function renderCreativeEmailDocument(input: unknown): string {
  const parsed = creativeRenderDocumentSchema.safeParse(input);
  if (!parsed.success) return "";
  const document = parsed.data;
  const background = document.canvas.background;
  const fallbackColor =
    background.kind === "solid"
      ? background.color
      : background.kind === "gradient"
        ? background.gradient.stops[0]?.color || "#0b0f19"
        : "#0b0f19";
  const backgroundCss =
    background.kind === "gradient"
      ? `${fallbackColor};background-image:${gradientToCss(background.gradient)}`
      : fallbackColor;
  const byId = new Map(document.nodes.map((node) => [node.id, node]));
  const ordered = [
    ...document.accessibility.readingOrder
      .map((id) => byId.get(id))
      .filter((node) => Boolean(node)),
    ...document.nodes.filter(
      (node) => !document.accessibility.readingOrder.includes(node.id)
    ),
  ];
  const content = ordered
    .map((node) => {
      if (!node || !node.layer.visible) return "";
      const props = node.props;
      if (node.primitive === "text") {
        return `<div style="margin:0 0 12px;color:${safeColor(
          props.color,
          "#ffffff"
        )};font-family:${escapeHtml(String(props.fontFamily || "Arial, sans-serif"))};font-size:${Number(
          props.fontSize || 18
        )}px;font-weight:${Number(props.fontWeight || 600)};line-height:${Number(
          props.lineHeight || 1.3
        )}">${escapeHtml(String(props.text || ""))}</div>`;
      }
      if (node.primitive === "image" || node.primitive === "frame") {
        const src = String(props.src || props.mediaSrc || "");
        if (!src) return "";
        return `<div style="margin:0 0 12px;text-align:center"><img src="${escapeHtml(
          src
        )}" alt="${escapeHtml(
          props.decorative === true ? "" : String(props.alt || "")
        )}" style="display:block;width:100%;max-width:520px;height:auto;margin:0 auto;border-radius:12px" /></div>`;
      }
      if (node.primitive === "button") {
        return `<div style="margin:0 0 12px;text-align:center"><a href="${escapeHtml(
          String(props.url || "#")
        )}" style="display:inline-block;padding:12px 20px;border-radius:999px;text-decoration:none;background:${safeColor(
          props.fill,
          "#9cff57"
        )};color:${safeColor(props.textColor, "#0b0f19")};font-weight:700">${escapeHtml(
          String(props.label || "Learn more")
        )}</a></div>`;
      }
      if (node.primitive === "divider") {
        return `<div style="border-top:${Number(props.thickness || 2)}px ${escapeHtml(
          String(props.style || "solid")
        )} ${safeColor(props.color, "#ffffff")};margin:12px 0"></div>`;
      }
      return "";
    })
    .join("");
  return `<div style="margin:0 0 16px;padding:20px;border-radius:16px;background:${backgroundCss};color:#ffffff">${content}</div>`;
}

export function renderCreativeFlowEmail(input: unknown): string {
  const parsed = creativeFlowSectionSchema.safeParse(input);
  if (!parsed.success) return "";
  const section = parsed.data;
  const image = `<img src="${escapeHtml(section.image.fallbackUrl)}" alt="${escapeHtml(
    section.imageTreatment.decorative ? "" : section.imageTreatment.altText
  )}" style="display:block;width:100%;height:auto;border-radius:12px" />`;
  const text = `${section.eyebrow ? `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px">${escapeHtml(section.eyebrow)}</div>` : ""}<div style="font-size:24px;font-weight:700;line-height:1.2;margin-bottom:8px">${escapeHtml(section.heading)}</div><div style="font-size:15px;line-height:1.55">${escapeHtml(section.body).replaceAll("\n", "<br/>")}</div>`;
  const imageFirst =
    section.layout === "image_left" ||
    section.layout === "image_top" ||
    section.layout === "square_wrap";
  const horizontal =
    section.layout === "image_left" ||
    section.layout === "image_right" ||
    section.layout === "square_wrap";
  const background =
    section.background.kind === "solid"
      ? section.background.color
      : section.background.kind === "gradient"
        ? section.background.gradient.stops[0]?.color || "#ffffff"
        : "#ffffff";
  if (!horizontal) {
    const parts = imageFirst ? [image, text] : [text, image];
    return `<div style="margin:0 0 16px;padding:20px;border-radius:16px;background:${background}">${parts
      .map((part) => `<div style="margin-bottom:${section.gutterPx}px">${part}</div>`)
      .join("")}</div>`;
  }
  const first = imageFirst ? image : text;
  const second = imageFirst ? text : image;
  const firstWidth = imageFirst
    ? section.imageWidthPercent
    : 100 - section.imageWidthPercent;
  return `<style>@media only screen and (max-width:600px){.tc-flow-cell{display:block!important;width:100%!important;padding:0 0 16px!important}}</style><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:${background};border-radius:16px"><tr><td class="tc-flow-cell" width="${firstWidth}%" style="padding:20px ${section.gutterPx / 2}px 20px 20px;vertical-align:middle">${first}</td><td class="tc-flow-cell" style="padding:20px 20px 20px ${section.gutterPx / 2}px;vertical-align:middle">${second}</td></tr></table>`;
}
