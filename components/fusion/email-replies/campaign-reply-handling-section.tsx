"use client";

/**
 * Compact Reply Handling section for Campaign Email workspace.
 * Not a second Integrations admin screen.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { CampaignReplyHandlingOverride } from "@/lib/fusion/email-replies/types";

type Display = {
  title: string;
  inheritedFrom: string;
  destinationLabel: string;
  tapVisibility: string;
  externalVisibility: string;
  keepCopy: boolean;
  readiness: string;
  verificationState: string;
  warning?: string;
  isOverride: boolean;
};

export function CampaignReplyHandlingSection(props: {
  campaignId: string;
  replyHandling?: CampaignReplyHandlingOverride | null;
  onOverrideChange?: (next: CampaignReplyHandlingOverride | null) => void;
}) {
  const [display, setDisplay] = useState<Display | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(
        `/api/email-replies?view=campaign&campaignId=${encodeURIComponent(props.campaignId)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setDisplay(data.display ?? null);
    })();
  }, [props.campaignId, props.replyHandling]);

  if (!display) {
    return (
      <section
        data-testid="campaign-reply-handling"
        className="rounded-lg border border-border/50 p-4 text-sm"
      >
        <h3 className="font-medium">Reply handling</h3>
        <p className="text-muted-foreground">Loading business policy…</p>
      </section>
    );
  }

  return (
    <section
      data-testid="campaign-reply-handling"
      className="space-y-3 rounded-lg border border-border/50 p-4 text-sm"
    >
      <h3 className="font-medium">{display.title}</h3>
      <p data-testid="campaign-reply-inherited">{display.inheritedFrom}</p>
      <p>
        <span className="text-muted-foreground">Tap visibility: </span>
        {display.tapVisibility}
      </p>
      <p>
        <span className="text-muted-foreground">External system: </span>
        {display.externalVisibility}
      </p>
      <p>
        <span className="text-muted-foreground">Copy in Tap: </span>
        {display.keepCopy ? "Yes" : "No"}
      </p>
      <p>
        <span className="text-muted-foreground">Readiness: </span>
        {display.readiness} · Verification: {display.verificationState}
      </p>
      {display.warning ? (
        <p className="text-amber-300" role="status">
          {display.warning}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11"
          data-testid="campaign-reply-override"
          onClick={() =>
            props.onOverrideChange?.({
              override: true,
              updatedAt: new Date().toISOString(),
            })
          }
        >
          Change for this Campaign
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="min-h-11"
          data-testid="campaign-reply-reset"
          onClick={() => props.onOverrideChange?.(null)}
        >
          Reset to business default
        </Button>
        <Link
          href="/dashboard/integrations#email-replies"
          className="inline-flex min-h-11 items-center rounded-md border border-border/60 px-3 text-sm"
          data-testid="campaign-reply-open-setup"
        >
          Open Email & Replies setup
        </Link>
      </div>
    </section>
  );
}
