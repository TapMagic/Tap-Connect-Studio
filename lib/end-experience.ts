import { nanoid } from "nanoid";
import type { ContentBlock } from "@/lib/types/campaign";

export type EndExperienceMode = "blocks" | "link" | "redirect";

export type EndExperience = {
  enabled: boolean;
  mode: EndExperienceMode;
  /** When mode=blocks — same content blocks as a campaign */
  blocks?: ContentBlock[];
  linkUrl?: string;
  linkLabel?: string;
  redirectUrl?: string;
};

export function defaultEndExperienceBlocks(): ContentBlock[] {
  return [
    {
      id: nanoid(8),
      type: "headline",
      order: 0,
      enabled: true,
      label: "Ended",
      data: {
        headline: "This offer has ended",
        subheadline: "Stay in touch — we’d love to share what’s next.",
        alignment: "center",
      },
    },
    {
      id: nanoid(8),
      type: "email_capture",
      order: 1,
      enabled: true,
      label: "Stay in touch",
      data: {
        headline: "Get updates",
        description: "Leave your email and we’ll keep you posted.",
        buttonLabel: "Keep me posted",
        fields: ["name", "email"],
        requireName: false,
        successMessage: "Thanks — you’re on the list.",
      },
    },
  ];
}

export function defaultEndExperience(): EndExperience {
  return {
    enabled: true,
    mode: "blocks",
    blocks: defaultEndExperienceBlocks(),
    linkLabel: "Contact us",
  };
}

export function parseEndExperience(raw: unknown): EndExperience {
  if (!raw || typeof raw !== "object") return defaultEndExperience();
  const o = raw as Record<string, unknown>;
  const mode = o.mode === "link" || o.mode === "redirect" ? o.mode : "blocks";
  return {
    enabled: o.enabled !== false,
    mode,
    blocks: Array.isArray(o.blocks) ? (o.blocks as ContentBlock[]) : defaultEndExperienceBlocks(),
    linkUrl: typeof o.linkUrl === "string" ? o.linkUrl : undefined,
    linkLabel: typeof o.linkLabel === "string" ? o.linkLabel : "Contact us",
    redirectUrl: typeof o.redirectUrl === "string" ? o.redirectUrl : undefined,
  };
}

/** Synthetic campaign-like payload for rendering end experiences */
export function endExperienceAsBlocks(exp: EndExperience): ContentBlock[] {
  if (!exp.enabled) return [];
  if (exp.mode === "redirect" && exp.redirectUrl) {
    return [
      {
        id: "end-redirect",
        type: "rich_text",
        order: 0,
        enabled: true,
        label: "Redirect",
        data: { body: `Continue at ${exp.redirectUrl}` },
      },
      {
        id: "end-redirect-btn",
        type: "button_group",
        order: 1,
        enabled: true,
        label: "Continue",
        data: {
          layout: "stack",
          buttons: [
            {
              id: "go",
              label: "Continue",
              url: exp.redirectUrl,
              style: "primary",
              icon: "external",
              fullWidth: true,
              openInNewTab: true,
            },
          ],
        },
      },
    ];
  }
  if (exp.mode === "link" && exp.linkUrl) {
    return [
      {
        id: "end-link-head",
        type: "headline",
        order: 0,
        enabled: true,
        label: "Ended",
        data: {
          headline: "This offer has ended",
          subheadline: "Tap below to stay connected.",
          alignment: "center",
        },
      },
      {
        id: "end-link-btn",
        type: "button_group",
        order: 1,
        enabled: true,
        label: "Link",
        data: {
          layout: "stack",
          buttons: [
            {
              id: "link",
              label: exp.linkLabel || "Contact us",
              url: exp.linkUrl,
              style: "primary",
              icon: "mail",
              fullWidth: true,
              openInNewTab: true,
            },
          ],
        },
      },
    ];
  }
  return exp.blocks?.length ? exp.blocks : defaultEndExperienceBlocks();
}
