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

const aiBlockSchema = z.object({
  type: z.enum(BLOCK_TYPES),
  label: z.string().min(1).max(80),
  data: z.record(z.string(), z.unknown()).default({}),
});

const aiResponseSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  blocks: z.array(aiBlockSchema).min(1).max(12),
});

export type AiGenerateResult = {
  title?: string;
  blocks: ContentBlock[];
};

const SYSTEM_PROMPT = `You are a campaign page builder for Tap Connect Studio.
NFC/QR taps open a mobile mini-webpage made of typed content blocks.

Return ONLY valid JSON matching this shape:
{
  "title": "optional short campaign title",
  "blocks": [
    { "type": "<block_type>", "label": "short editor label", "data": { ... } }
  ]
}

Allowed block types and typical data:
- headline: { headline, subheadline?, alignment?: "left"|"center"|"right" }
- rich_text: { body }
- hero_image: { imageUrl (can be ""), altText?, overlayText? }
- hero_video: { videoUrl (can be ""), provider: "youtube"|"vimeo"|"other", title? }
- product_details: { name, description, features: string[], price? }
- offer_coupon: { title, description, code?, ctaLabel }
- email_capture: { headline, description?, buttonLabel, fields: ("name"|"email"|"phone")[], successMessage }
- feedback_form: { headline, description?, buttonLabel, successMessage }
- google_review: { headline, description?, reviewUrl (can be ""), buttonLabel }
- map_location: { headline, address, mapUrl?, buttonLabel }
- button_group: { buttons: [{ id, label, url, style: "primary"|"secondary"|"outline" }] }
- action_block: { headline?, actions: [{ id, type: "review"|"feedback"|"call"|"directions"|"website"|"vcard"|"social"|"vip"|"shop"|"book"|"contact", label, url? }] }
- social_links: { headline?, links: [{ platform, url }] }
- faq: { headline, items: [{ id, question, answer }] }
- disclaimer: { text }
- age_gate: { minAge, message }
- vcard_download: { name, title?, phone?, email?, website?, buttonLabel }
- image_gallery: { images: [{ id, url, caption? }] }

Rules:
- Prefer 4–8 blocks, mobile-first, conversion-focused.
- Fill realistic marketing copy from the user prompt; leave media URLs empty unless provided.
- Use unique string ids inside nested arrays (buttons, actions, faq items, images).
- Do not invent block types outside the allowed list.`;

function toContentBlocks(
  raw: z.infer<typeof aiResponseSchema>["blocks"]
): ContentBlock[] {
  return raw.map((block, index) => ({
    id: nanoid(8),
    type: block.type,
    label: block.label,
    order: index,
    enabled: true,
    data: block.data,
  }));
}

export async function generateCampaignDraft(prompt: string): Promise<AiGenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Build a tap campaign page from this brief:\n\n${prompt}`,
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
    blocks: toContentBlocks(parsed.blocks),
  };
}
