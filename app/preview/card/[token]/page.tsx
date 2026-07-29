import "@/app/t/tap.css";
import { TapConnectCard } from "@/components/tap/tap-connect-card";
import { CompositionFontLoader } from "@/components/fusion/creative-studio/composition-font-loader";
import { getPreviewSession } from "@/lib/fusion/creative-studio/preview/tokens";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import { STUDIO_WORDING } from "@/lib/fusion/creative-studio/wording";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function PreviewError({
  title,
  consequence,
  recovery,
}: {
  title: string;
  consequence: string;
  recovery: string;
}) {
  return (
    <main
      className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-3 px-6 py-10 text-white"
      style={{ background: "#0b0f19" }}
      data-testid="preview-card-error"
    >
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-white/70">{consequence}</p>
      <p className="text-sm text-white/55">{recovery}</p>
      <p className="text-xs text-white/35">Powered by Tap The Magic</p>
    </main>
  );
}

export default async function PreviewCardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const decoded = decodeURIComponent(token);
  const result = getPreviewSession(decoded);

  if (!result.ok) {
    const map: Record<string, [string, string, string]> = {
      preview_expired: [
        "This preview has expired",
        "The temporary draft link is no longer valid.",
        "Ask the Card owner to generate a new Live device preview.",
      ],
      preview_revoked: [
        "This preview was revoked",
        "The temporary draft link was turned off.",
        "Ask the Card owner to generate a new Live device preview.",
      ],
      preview_unavailable: [
        "Preview unavailable",
        "This temporary draft could not be loaded.",
        "Ask the Card owner to open Live device again from the editor.",
      ],
      preview_token_invalid: [
        "Preview link is not valid",
        "This URL does not match a secure preview session.",
        "Scan a fresh QR from TapConnect Studio.",
      ],
      preview_tenant_mismatch: [
        "Preview link is not valid",
        "This preview does not belong to the expected business.",
        "Scan a fresh QR from TapConnect Studio.",
      ],
    };
    const [title, consequence, recovery] = map[result.reason] || [
      "Preview unavailable",
      "The draft could not be shown.",
      "Generate a new Live device preview from the editor.",
    ];
    return (
      <PreviewError title={title} consequence={consequence} recovery={recovery} />
    );
  }

  const { record } = result;
  let config: TapConnectCardConfig;
  let profile: BrandContactProfile;
  try {
    config = JSON.parse(record.snapshotJson) as TapConnectCardConfig;
    profile = JSON.parse(record.profileJson) as BrandContactProfile;
  } catch {
    return (
      <PreviewError
        title="Preview draft was damaged"
        consequence="The temporary snapshot could not be read."
        recovery="Generate a new Live device preview from the editor."
      />
    );
  }

  const updatedLabel = (() => {
    try {
      const d = new Date(record.updatedAt);
      const mins = Math.round((Date.now() - d.getTime()) / 60_000);
      if (mins < 1) return "Updated just now";
      if (mins < 60) return `Updated ${mins} min ago`;
      return `Updated ${d.toLocaleString()}`;
    } catch {
      return "Updated recently";
    }
  })();

  return (
    <main
      className="min-h-dvh px-4 py-6"
      style={{ background: "linear-gradient(180deg,#12141a,#0b0f19)" }}
      data-testid="preview-card-page"
      data-preview-revision={String(record.revision)}
    >
      <CompositionFontLoader config={config} />
      <div
        className="mx-auto mb-4 max-w-md rounded-xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-amber-50"
        data-testid="preview-draft-banner"
        role="status"
      >
        <p className="text-sm font-medium">{record.cardName || record.businessName}</p>
        <p className="text-xs opacity-90">{STUDIO_WORDING.workingDraft}</p>
        <p className="text-xs opacity-80">{updatedLabel}</p>
        <p className="text-xs opacity-80">{STUDIO_WORDING.previewOnlyNotPublished}</p>
      </div>
      <div className="mx-auto max-w-md" data-testid="preview-card-composition-host">
        <TapConnectCard
          config={config}
          profile={profile}
          businessName={record.businessName}
          logoUrl={record.logoUrl}
          reviewUrl={record.reviewUrl}
          forceExpanded
          interactionMode="preview"
          previewSafe
          compositionForceMobile={false}
        />
      </div>
      <p className="mx-auto mt-6 max-w-md text-center text-[11px] text-white/35">
        Powered by Tap The Magic · Temporary draft preview
      </p>
    </main>
  );
}
