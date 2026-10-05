import { TapConnectExperience } from "@/components/tap/tap-connect-experience";
import { CardViewportSurface } from "@/components/tap/card-viewport-surface";
import { CompositionFontLoader } from "@/components/fusion/creative-studio/composition-font-loader";
import { LiveDeviceRefresh } from "@/components/fusion/creative-studio/live-device-refresh";
import { LiveDeviceDebugEvidence } from "@/components/fusion/creative-studio/live-device-debug-evidence";
import { getPreviewSession } from "@/lib/fusion/creative-studio/preview/tokens";
import { getCardDraft, isTapConnectCardDraft } from "@/lib/fusion/card/draft";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import { STUDIO_WORDING } from "@/lib/fusion/creative-studio/wording";
import {
  inspectPreviewVisualResourcePortability,
  resolvePreviewVisualResources,
} from "@/lib/fusion/creative-studio/preview/visual-resources";

function PreviewError({ title, consequence, recovery, testId }: { title: string; consequence: string; recovery: string; testId: string }) {
  return <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-3 px-6 py-10 text-white" style={{ background: "#0b0f19" }} data-testid={testId}><h1 className="text-xl font-semibold">{title}</h1><p className="text-sm text-white/70">{consequence}</p><p className="text-sm text-white/55">{recovery}</p><p className="text-xs text-white/35">Powered by Tap The Magic</p></main>;
}

const ERROR_COPY: Record<string, [string, string, string]> = {
  preview_expired: ["This preview has expired", "The temporary draft link is no longer valid.", "Ask the Card owner to generate a new Live Device Preview."],
  preview_revoked: ["This preview was revoked", "The temporary draft link was turned off.", "Ask the Card owner to generate a new Live Device Preview."],
  preview_unavailable: ["Preview unavailable", "This temporary draft could not be loaded.", "Ask the Card owner to open Live Device Preview again from Studio."],
  preview_token_invalid: ["Preview link is not valid", "This URL does not match a secure preview session.", "Scan a fresh QR from TapConnect Studio."],
  preview_tenant_mismatch: ["Preview link is not valid", "This preview does not belong to the expected business.", "Scan a fresh QR from TapConnect Studio."],
};

export async function LiveDevicePreviewPage({ token, debug = false, pageTestId = "preview-live-page", errorTestId = "preview-live-error" }: { token: string; debug?: boolean; pageTestId?: string; errorTestId?: string }) {
  const result = getPreviewSession(decodeURIComponent(token));
  if (!result.ok) {
    const [title, consequence, recovery] = ERROR_COPY[result.reason] || ["Preview unavailable", "The draft could not be shown.", "Generate a new Live Device Preview from Studio."];
    return <PreviewError title={title} consequence={consequence} recovery={recovery} testId={errorTestId} />;
  }

  const { record } = result;
  let config: TapConnectCardConfig;
  let profile: BrandContactProfile;
  let effectiveRevision = record.revision;
  let effectiveUpdatedAt = record.updatedAt;
  try {
    const raw = JSON.parse(record.snapshotJson) as Record<string, unknown>;
    config = raw && Array.isArray(raw.nodes) && !Array.isArray(raw.sections)
      ? ({ version: 1, accentColor: "#b8ff2c", surfaceColor: "#0b0f19", textColor: "#ffffff", headerEnergy: 50, collapsible: false, defaultCollapsed: false, actionsLayout: "stack", sections: [], rootComposition: raw } as unknown as TapConnectCardConfig)
      : ({ ...(raw as unknown as TapConnectCardConfig), sections: Array.isArray(raw.sections) ? ((raw as unknown as TapConnectCardConfig).sections || []) : [] });
    profile = JSON.parse(record.profileJson) as BrandContactProfile;
    if (record.mode === "follow") {
      try {
        const latest = await getCardDraft(record.businessId);
        if (isTapConnectCardDraft(latest.tapCardDraft) && latest.tapCardDraftRevision >= effectiveRevision) {
          config = latest.tapCardDraft;
          effectiveRevision = latest.tapCardDraftRevision;
          effectiveUpdatedAt = latest.tapCardDraftUpdatedAt?.toISOString() || effectiveUpdatedAt;
        }
      } catch {
        // The signed session snapshot remains a safe read-only fallback.
      }
    }
  } catch {
    return <PreviewError title="Preview draft was damaged" consequence="The temporary snapshot could not be read." recovery="Generate a new Live Device Preview from Studio." testId={errorTestId} />;
  }

  const portabilityIssues = inspectPreviewVisualResourcePortability({
    config,
    profile,
    logoUrl: record.logoUrl,
  });
  if (portabilityIssues.length > 0) {
    return <PreviewError title="A committed image is not portable to Live Device" consequence="This preview contains an image that exists only in the Studio browser or on the editor machine." recovery="Choose or upload the Asset through Studio so it receives a canonical MediaAsset reference, then generate the preview again." testId={errorTestId} />;
  }

  const resolvedConfig = resolvePreviewVisualResources(config, token);
  const resolvedProfile = resolvePreviewVisualResources(profile, token);
  const resolvedLogoUrl = resolvePreviewVisualResources({ logoUrl: record.logoUrl }, token).logoUrl;

  return (
    <main className="relative isolate min-h-dvh overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(.75rem,env(safe-area-inset-top))]" style={{ background: "linear-gradient(180deg,#12141a,#0b0f19)" }} data-testid={pageTestId} data-preview-revision={String(effectiveRevision)} data-preview-snapshot-revision={String(record.revision)} data-preview-mode={record.mode || "follow"} data-preview-session-id={record.sid} data-preview-card-id={record.brandKitId}>
      <CompositionFontLoader config={resolvedConfig} />
      <div className="relative z-[1] mx-3 mb-3 rounded-xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-amber-50 sm:mx-auto sm:max-w-md" data-testid="preview-draft-banner" role="status">
        <p className="text-sm font-medium">{record.cardName || record.businessName}</p><p className="text-xs opacity-90">{STUDIO_WORDING.workingDraft}</p><p className="text-xs opacity-80">Updated {new Date(effectiveUpdatedAt).toLocaleString()}</p><p className="text-xs opacity-80">{STUDIO_WORDING.previewOnlyNotPublished}</p><LiveDeviceRefresh />
      </div>
      <CardViewportSurface environment="runtime" testId="live-device-card-viewport" className="relative z-[1]">
        <div data-testid="preview-card-composition-host"><TapConnectExperience config={resolvedConfig} profile={resolvedProfile} businessName={record.businessName} logoUrl={resolvedLogoUrl} reviewUrl={record.reviewUrl} forceExpanded interactionMode="preview" previewSafe compositionForceMobile={false} externalFullBleedSurface routingMode="history" viewportBackdrop /></div>
      </CardViewportSurface>
      <p className="relative z-[1] mx-3 mt-6 text-center text-[11px] text-white/35 sm:mx-auto sm:max-w-md">Powered by Tap The Magic · Temporary draft preview</p>
      {debug ? <LiveDeviceDebugEvidence cardId={record.brandKitId} revision={effectiveRevision} snapshotRevision={record.revision} sessionId={record.sid} sessionCreatedAt={record.createdAt} followMode={record.mode || "follow"} /> : null}
    </main>
  );
}
