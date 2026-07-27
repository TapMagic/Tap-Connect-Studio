import type { BlockType, ContentBlock } from "@/lib/types/campaign";

const KNOWN_BLOCK_TYPES = new Set<string>([
  "hero_image",
  "hero_video",
  "headline",
  "rich_text",
  "button_group",
  "product_details",
  "image_gallery",
  "offer_coupon",
  "email_capture",
  "feedback_form",
  "google_review",
  "map_location",
  "vcard_download",
  "social_links",
  "disclaimer",
  "age_gate",
  "faq",
  "action_block",
  "upcoming_schedule",
  "digital_card",
  "spacer",
  "columns",
  "banner",
]);

/** Legacy / seed / autopilot aliases → CampaignPageRenderer block types */
const TYPE_ALIASES: Record<string, BlockType> = {
  heading: "headline",
  text: "rich_text",
  offer: "offer_coupon",
  coupon: "offer_coupon",
  button: "button_group",
  buttons: "button_group",
  hero: "headline",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function resolveType(
  rawType: string,
  data: Record<string, unknown>
): BlockType | null {
  if (rawType === "hero") {
    const imageUrl = typeof data.imageUrl === "string" ? data.imageUrl.trim() : "";
    return imageUrl ? "hero_image" : "headline";
  }
  const mapped = TYPE_ALIASES[rawType] ?? rawType;
  if (!KNOWN_BLOCK_TYPES.has(mapped)) return null;
  return mapped as BlockType;
}

function normalizeData(
  type: BlockType,
  data: Record<string, unknown>
): Record<string, unknown> {
  if (type === "headline") {
    return {
      headline: String(data.headline ?? data.text ?? ""),
      subheadline: String(data.subheadline ?? ""),
      alignment: String(data.alignment ?? "center"),
    };
  }
  if (type === "rich_text") {
    return {
      body: String(data.body ?? data.text ?? ""),
    };
  }
  if (type === "offer_coupon") {
    const code = String(data.code ?? data.title ?? "");
    return {
      title: String(data.title ?? data.code ?? "Special offer"),
      description: String(data.description ?? ""),
      code,
      ctaLabel: String(data.ctaLabel ?? "Claim offer"),
      lockedUntilContact: data.lockedUntilContact !== false,
      // Shared visual adapter may persist CTA color overrides (Campaign Format Migration)
      ...(typeof data.backgroundColor === "string" && data.backgroundColor.trim()
        ? { backgroundColor: data.backgroundColor }
        : {}),
      ...(typeof data.textColor === "string" && data.textColor.trim()
        ? { textColor: data.textColor }
        : {}),
    };
  }
  if (type === "hero_image") {
    return {
      imageUrl: String(data.imageUrl ?? ""),
      altText: String(data.altText ?? data.headline ?? ""),
      overlayText: data.overlayText,
      aspect: data.aspect,
      objectFit: data.objectFit,
    };
  }
  if (type === "button_group") {
    const buttons = Array.isArray(data.buttons)
      ? data.buttons
      : data.label || data.url
        ? [
            {
              id: "btn_1",
              label: String(data.label ?? "Learn more"),
              url: String(data.url ?? data.href ?? "#"),
              style: "primary",
            },
          ]
        : [];
    return { buttons, layout: data.layout ?? "stack" };
  }
  return data;
}

function defaultLabel(type: BlockType): string {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Normalize campaign content blocks for the editor + CampaignPageRenderer.
 * Accepts legacy seed shapes (`heading`/`text`/`offer` + `props`) and missing
 * `enabled`/`data`/`order` fields that otherwise yield a blank center preview.
 */
export function normalizeContentBlocks(raw: unknown): ContentBlock[] {
  if (!Array.isArray(raw)) return [];

  const out: ContentBlock[] = [];
  raw.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const b = item as Record<string, unknown>;
    const props = asRecord(b.props);
    const dataIn = asRecord(b.data);
    const merged = { ...props, ...dataIn };
    const rawType = String(b.type ?? "");
    const type = resolveType(rawType, merged);
    if (!type) return;

    const block: ContentBlock = {
      id: String(b.id ?? `block_${index}`),
      type,
      label: String(b.label ?? defaultLabel(type)),
      order: typeof b.order === "number" ? b.order : index,
      // Missing enabled must render (legacy seed omitted the field)
      enabled: b.enabled !== false,
      data: normalizeData(type, merged),
    };
    if (b.style && typeof b.style === "object") {
      block.style = b.style as ContentBlock["style"];
    }
    if (b.channel === "page" || b.channel === "email" || b.channel === "both") {
      block.channel = b.channel;
    }
    out.push(block);
  });

  return out.sort((a, b) => a.order - b.order);
}
