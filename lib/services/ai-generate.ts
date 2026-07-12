import OpenAI from "openai";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { BlockType, ContentBlock } from "@/lib/types/campaign";

const BLOCK_TYPES = [
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
] as const satisfies readonly BlockType[];

const themeSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

const aiBlockSchema = z.object({
  type: z.enum(BLOCK_TYPES),
  label: z.string().min(1).max(80),
  data: z.record(z.string(), z.unknown()).default({}),
});

const aiResponseSchema = z.object({
  title: z.string().min(1).max(120),
  industry: z.string().min(1).max(60).optional(),
  theme: themeSchema,
  blocks: z.array(aiBlockSchema).min(4).max(10),
});

export type AiGenerateResult = {
  title: string;
  industry?: string;
  theme: z.infer<typeof themeSchema>;
  blocks: ContentBlock[];
};

const SYSTEM_PROMPT = `You are the senior campaign creative for Tap Connect Studio.
People tap an NFC/QR tag and land on a mobile mini-webpage built from typed content blocks.

MOST USERS GIVE WEAK PROMPTS. Your job is to over-deliver:
- Infer industry (cigars, vape, salon, restaurant, retail, real estate, events, fitness, etc.)
- Invent specific product names, prices, dates, discount codes, and FAQs when missing
- Write polished marketing copy — never a single vague sentence
- Honor explicit requests (colors, dates, discounts, brand tone) exactly
- If they ask for blues, return a blue palette in theme — never default green unless they ask for green

Return ONLY valid JSON:
{
  "title": "campaign title",
  "industry": "short industry label",
  "theme": {
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "backgroundColor": "#hex",
    "textColor": "#hex"
  },
  "blocks": [
    { "type": "block_type", "label": "editor label", "data": { ... } }
  ]
}

Allowed block types + data:
- headline: { headline, subheadline?, alignment?: "left"|"center"|"right" }
- rich_text: { body }  // multi-sentence value prop, dates, fine print highlights
- hero_image: { imageUrl: "", altText?, overlayText? }
- hero_video: { videoUrl: "", provider: "youtube"|"vimeo"|"other", title? }
- product_details: { name, description, features: string[3-6], price? }
- offer_coupon: { title, description, code?, ctaLabel, lockedUntilContact: true }
- email_capture: { headline, description?, buttonLabel, fields: ("name"|"email"|"phone")[], requireName?: boolean, requirePhone?: boolean, successMessage }
- feedback_form, google_review, map_location, button_group, action_block, social_links, faq, disclaimer, age_gate, vcard_download, image_gallery

MANDATORY STRUCTURE for sales / coupon / promo prompts:
1) headline (specific offer + dates if given)
2) rich_text OR product_details (concrete details)
3) email_capture BEFORE offer_coupon (contact unlocks coupon)
   - fields include name+email (and phone when it helps)
   - requireName true for offers
   - successMessage like "You're in — your coupon is below."
4) offer_coupon with lockedUntilContact true, real code, clear terms in description
5) disclaimer with eligibility / expiry
Optional: faq, action_block (call/directions/review)

COLOR RULES:
- Always set theme from the brief. Examples:
  - blues → primary ~#3B82F6, secondary ~#0EA5E9, dark navy background, light text
  - warm premium → deep charcoal + gold/amber
  - never ignore requested palette

COPY RULES:
- Specific > generic. Use dates, % off, dollar amounts, product names.
- Mobile-first. 5–8 blocks typical.
- Leave image/video URLs empty unless user provided them.
- Unique string ids in nested arrays (buttons, actions, faq items).
- Do not invent block types outside the list.`;

function toContentBlocks(
  raw: z.infer<typeof aiResponseSchema>["blocks"]
): ContentBlock[] {
  return raw.map((block, index) => ({
    id: nanoid(8),
    type: block.type,
    label: block.label,
    order: index,
    enabled: true,
    data: normalizeBlockData(block.type, block.data),
  }));
}

function normalizeBlockData(type: BlockType, data: Record<string, unknown>) {
  if (type === "offer_coupon" && data.lockedUntilContact === undefined) {
    return { ...data, lockedUntilContact: true };
  }
  if (type === "email_capture") {
    const fields = Array.isArray(data.fields) ? (data.fields as string[]) : ["email"];
    const next = new Set(fields);
    next.add("email");
    if (!next.has("name")) next.add("name");
    return {
      ...data,
      fields: Array.from(next),
      requireName: data.requireName !== false,
      successMessage:
        (data.successMessage as string) || "You're in — your coupon is below.",
    };
  }
  return data;
}

export async function generateCampaignDraft(prompt: string): Promise<AiGenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.85,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Build a complete tap campaign page from this brief.
If anything is vague, invent strong industry-specific details that still match the intent.
Honor colors, dates, and discounts exactly when provided.

Brief:
${prompt}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned invalid JSON");
  }

  const parsed = aiResponseSchema.parse(parsedJson);

  return {
    title: parsed.title,
    industry: parsed.industry,
    theme: parsed.theme,
    blocks: toContentBlocks(parsed.blocks),
  };
}
