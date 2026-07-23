"use client";

import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BuilderPreviewEmptyReason } from "@/lib/utils/builder-preview-empty";

export {
  campaignPreviewEmptyReason,
  tapCardPreviewEmptyReason,
} from "@/lib/utils/builder-preview-empty";

type Reason = BuilderPreviewEmptyReason;

type Props = {
  reason: Reason;
  onAddBlock?: () => void;
  variant?: "campaign" | "card";
};

const COPY: Record<
  Reason,
  { title: string; body: string; hint: string }
> = {
  no_blocks: {
    title: "Nothing to preview yet",
    body: "Your tap page is empty — add a block from the left panel to see it here live.",
    hint: "Try Headline, Hero image, or Offer / Coupon to get started.",
  },
  email_only: {
    title: "Page preview is empty",
    body: "Every block is set to Email only, so nothing shows on the tap page.",
    hint: "Select a block → change Show on to Tap page only or Page + email.",
  },
  all_disabled: {
    title: "All blocks are hidden",
    body: "Blocks exist but are turned off — enable at least one to fill the preview.",
    hint: "Select a block in the list and check the Enabled box in the inspector.",
  },
};

const CARD_COPY: Partial<Record<Reason, { title: string; body: string; hint: string }>> = {
  no_blocks: {
    title: "Your card is empty",
    body: "Add a text block, special offer, or action button from the left panel.",
    hint: "Try Special offer, Text, or a social action to get started.",
  },
  all_disabled: {
    title: "All segments are hidden",
    body: "Segments exist but are disabled — turn one on to preview your card.",
    hint: "Select a segment and check Enabled in the editor.",
  },
};

export function BuilderPreviewEmpty({ reason, onAddBlock, variant = "campaign" }: Props) {
  const copy =
    variant === "card" && CARD_COPY[reason] ? CARD_COPY[reason]! : COPY[reason];

  return (
    <div className="builder-preview-empty mx-4 my-8" role="status">
      <div className="builder-preview-empty-icon" aria-hidden>
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <p className="builder-preview-empty-title">{copy.title}</p>
      <p className="builder-preview-empty-body">{copy.body}</p>
      <p className="builder-preview-empty-hint">{copy.hint}</p>
      {onAddBlock && variant === "campaign" ? (
        <Button type="button" size="sm" className="mt-4" onClick={onAddBlock}>
          <Plus className="mr-1 h-4 w-4" />
          Add first block
        </Button>
      ) : null}
    </div>
  );
}
