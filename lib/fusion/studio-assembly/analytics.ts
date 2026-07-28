/**
 * Restrained Studio Assembly / landing analytics.
 * Uses console + optional CustomEvent — no second pipeline, no private Card content.
 */

export type StudioAssemblyAnalyticsEvent =
  | "studio_assembly_started"
  | "studio_assembly_skipped"
  | "studio_assembly_completed"
  | "studio_assembly_replayed"
  | "studio_assembly_accelerated"
  | "product_explorer_capability_selected"
  | "product_explorer_feature_selected"
  | "tapconnect_studio_selector_changed"
  | "landing_primary_cta"
  | "landing_secondary_cta";

export type AssemblyAnalyticsPayload = {
  event: StudioAssemblyAnalyticsEvent;
  mode?: string;
  capabilityId?: string;
  featureId?: string;
  selector?: string;
  /** Public-safe only — never PII or private Card body */
  meta?: Record<string, string | number | boolean | null>;
};

const LISTENERS: Array<(payload: AssemblyAnalyticsPayload) => void> = [];

export function onAssemblyAnalytics(
  listener: (payload: AssemblyAnalyticsPayload) => void
): () => void {
  LISTENERS.push(listener);
  return () => {
    const i = LISTENERS.indexOf(listener);
    if (i >= 0) LISTENERS.splice(i, 1);
  };
}

export function trackAssemblyEvent(payload: AssemblyAnalyticsPayload): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("tapconnect:assembly-analytics", { detail: payload })
    );
  }
  for (const listener of LISTENERS) {
    try {
      listener(payload);
    } catch {
      /* never break UX for analytics */
    }
  }
  if (process.env.NODE_ENV !== "production") {
    console.debug("[assembly-analytics]", payload.event, payload);
  }
}
