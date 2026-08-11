"use client";

import { useMemo } from "react";
import { TopShelfStudioPremiumAction } from "@/lib/fusion/creative-studio/visual-parts/packages/top-shelf/TopShelfStudioBridge";
import { buttonElementDefaults } from "@/lib/fusion/card/designer-elements";
import { updateButtonLabel } from "@/lib/fusion/creative-studio/button-composition";
import {
  applyTopShelfPremiumAction,
  TOP_SHELF_ANCHOR_CHARCOAL,
  TOP_SHELF_ANCHOR_COBALT,
} from "@/lib/fusion/creative-studio/visual-parts";

/**
 * Dev-only isolate for Top Shelf evidence.
 * Renders the shared Studio package component only — no composition-canvas
 * specimen frame (rounded-xl border) which is review chrome, not product.
 */
export function TopshelfSpecimenClient({
  anchor,
  placement = "right",
  halo,
}: {
  anchor?: string;
  placement?: "left" | "right";
  halo?: number;
}) {
  const props = useMemo(() => {
    const id = "btn-topshelf-specimen";
    const defaults = buttonElementDefaults("website" as never, id);
    let next: Record<string, unknown> = {
      ...defaults,
      actionType: "website",
      href: "https://example.com/safe-test",
      icon: "lock",
      description: "Member benefits",
      showIcon: true,
      showLabel: true,
      showDescription: true,
      elementKind: "button",
      accessibleLabel: "Unlock Access",
    };
    next = updateButtonLabel(next, "Unlock Access", id);
    return applyTopShelfPremiumAction(next, "button", {
      anchorColor:
        anchor === "cobalt" || anchor === TOP_SHELF_ANCHOR_COBALT
          ? TOP_SHELF_ANCHOR_COBALT
          : TOP_SHELF_ANCHOR_CHARCOAL,
      iconRingPlacement: placement,
      haloIntensity: halo ?? 0.5,
    });
  }, [anchor, placement, halo]);

  return (
    <main
      style={{
        margin: 0,
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "grid",
        placeItems: "center",
      }}
    >
      {/*
        Evidence host only — padding/background are review chrome.
        Screenshot target is [data-testid=topshelf-action-specimen] → the product hull.
      */}
      <div
        data-testid="topshelf-action-specimen"
        data-topshelf-evidence-host="true"
        style={{
          display: "inline-block",
          padding: 48,
          background: "#0a0a0a",
          // Explicitly no outer product panel / rounded frame.
          border: "none",
          borderRadius: 0,
          boxShadow: "none",
        }}
      >
        <a
          href="https://example.com/safe-test"
          data-vp-topshelf="true"
          data-vp-assembly="recipe/enhanced/top-shelf-premium-action/v1"
          data-action-type="website"
          data-action-href="https://example.com/safe-test"
          style={{ display: "inline-block", width: 360, textDecoration: "none" }}
          aria-label="Unlock Access"
        >
          <TopShelfStudioPremiumAction
            props={props}
            label="Unlock Access"
            description="Member benefits"
          />
        </a>
      </div>
    </main>
  );
}
