"use client";

/**
 * Email Format Migration — Adaptive Task Drawer panels.
 */

import type { ReactNode } from "react";
import { MediaPicker } from "@/components/media/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  emailProvenanceLabel,
  checkEmailContrast,
  emailTypographyFallback,
  resolveEmailSurface,
  resolveSelectedEmailCta,
  type EmailVisualModel,
} from "@/lib/fusion/authoring/email-visual-resolve";
import { BRAND_COLOR_ROLE_LABELS } from "@/lib/fusion/authoring/brand-kit-adapter";
import {
  compatibilityForProperty,
  previewModeLabel,
  type EmailPreviewMode,
} from "@/lib/fusion/email/compatibility";
import {
  subjectPreheaderGuidance,
  resolvePlainTextForDocument,
} from "@/lib/fusion/email/plain-text";
import type { EmailAudienceReadiness } from "@/lib/fusion/email/audience-readiness";
import type { EmailDocument } from "@/lib/fusion/email/document";
import { emailApprovalHostMessage } from "@/lib/fusion/email/approval";
import { staleOfferReviewMessage } from "@/lib/fusion/email/offer-binding";
import type { EmailOfferProjectionState } from "@/lib/fusion/email/offer-binding";
import { validateEmailHtml, renderEmailHtml } from "@/lib/fusion/email/html-render";
import { cn } from "@/lib/utils";

export type EmailVisualDrawerProps = {
  toolId: string | null;
  model: EmailVisualModel;
  document: EmailDocument;
  businessName: string;
  campaignTitle: string;
  campaignId: string;
  logoUrl?: string | null;
  primaryColor?: string;
  historyLabels?: string[];
  mediaUploadReady?: boolean;
  stockReady?: boolean;
  /** Resend fully configured (server-computed via isEmailReady). When false, running on mock adapter. */
  emailReady?: boolean;
  audienceReadiness?: EmailAudienceReadiness;
  offerState?: EmailOfferProjectionState;
  previewMode?: EmailPreviewMode;
  onPreviewModeChange?: (mode: EmailPreviewMode) => void;
  onOverrideSurface: (propertyKey: string, value: string) => void;
  onResetSurface: (propertyKey: string) => void;
  onResetThemeToBrand: () => void;
  onOverrideCta: (itemId: string, propertyKey: string, value: string) => void;
  onResetCtaProperty: (itemId: string, propertyKey: string) => void;
  onResetCtaItem: (itemId: string) => void;
  onSelectCta: (itemId: string) => void;
  onApplySimilarCtaBackground: (itemId: string, value: string) => void;
  onDocumentChange: (patch: Partial<EmailDocument>) => void;
  onApprove?: () => void;
  onReject?: () => void;
  onRefreshOffer?: () => void;
  onOpenOutlineTool?: () => void;
  blockOutline?: ReactNode;
  contentEditor?: ReactNode;
  legacyPanel?: ReactNode;
};

function ProvenanceChip({ source }: { source: string }) {
  const label = emailProvenanceLabel(source as "brand" | "surface" | "preset" | "custom");
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        source === "custom" && "bg-amber-500/20 text-amber-200",
        source === "surface" && "bg-sky-500/20 text-sky-200",
        source === "brand" && "bg-primary/15 text-primary",
        source === "preset" && "bg-white/10 text-white/70"
      )}
      data-testid={`email-provenance-${source}`}
    >
      {label}
    </span>
  );
}

const PREVIEW_MODES: EmailPreviewMode[] = [
  "desktop",
  "mobile",
  "light_inbox",
  "dark_inbox",
  "image_blocked",
  "plain_text",
  "inbox_list",
];

export function EmailVisualDrawer({
  toolId,
  model,
  document,
  businessName,
  campaignTitle,
  campaignId,
  logoUrl,
  primaryColor,
  historyLabels = [],
  mediaUploadReady = false,
  stockReady = false,
  emailReady = false,
  audienceReadiness,
  offerState = "unbound",
  previewMode = "desktop",
  onPreviewModeChange,
  onOverrideSurface,
  onResetSurface,
  onResetThemeToBrand,
  onOverrideCta,
  onResetCtaProperty,
  onResetCtaItem,
  onSelectCta,
  onApplySimilarCtaBackground,
  onDocumentChange,
  onApprove,
  onReject,
  onRefreshOffer,
  onOpenOutlineTool,
  blockOutline,
  contentEditor,
  legacyPanel,
}: EmailVisualDrawerProps) {
  const surface = resolveEmailSurface(model);
  const cta = resolveSelectedEmailCta(model);
  const selected =
    model.items.find((i) => i.id === model.selectedItemId) ?? model.items[0];
  const contrast = checkEmailContrast(model);
  const typography = emailTypographyFallback(model);
  const staleMsg = staleOfferReviewMessage(offerState);
  const subjectTips = subjectPreheaderGuidance(
    document.subject || "",
    document.preheader || ""
  );
  const plain = resolvePlainTextForDocument(document, businessName);
  const html = renderEmailHtml({
    template: document,
    businessName,
    logoUrl: document.logoUrl || logoUrl,
    theme: { ...document.visualTheme, primaryColor },
  });
  const htmlValidation = validateEmailHtml(html);

  if (!toolId || toolId === "outline") {
    return (
      <div className="space-y-4" data-testid="email-drawer-outline">
        {staleMsg ? (
          <div
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100"
            data-testid="email-stale-offer-warning"
          >
            {staleMsg}
            {onRefreshOffer ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                data-testid="email-refresh-offer"
                onClick={onRefreshOffer}
              >
                Refresh offer facts
              </Button>
            ) : null}
          </div>
        ) : null}
        <p className="text-xs text-white/65">
          Parent Campaign: <strong className="text-white">{campaignTitle}</strong>
        </p>
        <p className="text-xs text-white/45">
          Status: {document.approvalState || "draft"} ·{" "}
          {document.enabled ? "enabled" : "disabled"}
        </p>
        {blockOutline}
      </div>
    );
  }

  if (toolId === "content") {
    return (
      <div className="space-y-4" data-testid="email-drawer-content">
        {contentEditor}
      </div>
    );
  }

  if (toolId === "brand") {
    return (
      <div className="space-y-4" data-testid="email-drawer-brand">
        <p className="text-xs text-white/65">
          Brand Kit is the default. Email stores presentation overrides — not live linked sync.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          data-testid="email-reset-theme-brand"
          onClick={onResetThemeToBrand}
        >
          Reset entire theme to Brand
        </Button>
      </div>
    );
  }

  if (toolId === "colors") {
    const keys = [
      { key: "background", label: "Email background" },
      { key: "contentSurface", label: "Content surface" },
      { key: "headline", label: "Headline" },
      { key: "body", label: "Body text" },
      { key: "ctaBackground", label: BRAND_COLOR_ROLE_LABELS.cta },
      { key: "link", label: BRAND_COLOR_ROLE_LABELS.link },
    ] as const;
    return (
      <div className="space-y-4" data-testid="email-drawer-colors">
        {keys.map(({ key, label }) => {
          const resolved = surface[key];
          const value = resolved?.value ?? "#000000";
          const compat = compatibilityForProperty(key === "ctaBackground" ? "ctaBackground" : key);
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">{label}</Label>
                {resolved ? <ProvenanceChip source={resolved.source} /> : null}
              </div>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={value.startsWith("#") ? value.slice(0, 7) : "#000000"}
                  onChange={(e) => onOverrideSurface(key, e.target.value)}
                  className="h-9 w-10 cursor-pointer rounded border-0"
                  data-testid={`email-color-${key}`}
                  aria-label={label}
                />
                <Input
                  value={value}
                  onChange={(e) => onOverrideSurface(key, e.target.value)}
                  className="font-mono text-xs"
                  data-testid={`email-color-${key}-hex`}
                  aria-label={`${label} hex`}
                />
              </div>
              {compat?.warning ? (
                <p className="text-[10px] text-amber-200/80">{compat.warning}</p>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px]"
                data-testid={`email-reset-color-${key}`}
                onClick={() => onResetSurface(key)}
              >
                Reset to Brand
              </Button>
            </div>
          );
        })}
        <div className="space-y-2 border-t border-white/10 pt-3">
          {contrast.map((c) => (
            <p
              key={c.id}
              className={cn("text-[10px]", c.severity === "ok" ? "text-white/45" : "text-amber-200")}
              data-testid={`email-contrast-${c.id}`}
            >
              {c.label}: {c.severity === "ok" ? "OK" : c.message}
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (toolId === "typography") {
    const fontCompat = compatibilityForProperty("font");
    return (
      <div className="space-y-4" data-testid="email-drawer-typography">
        <p className="text-xs text-white/65">
          Preferred Brand font: <strong>{typography.preferred}</strong>
        </p>
        <p className="text-xs text-white/55">
          Email-safe fallback: {typography.emailSafe}
        </p>
        <p className="text-[11px] text-amber-200/90" data-testid="email-font-fallback-warning">
          {fontCompat?.warning || typography.warning}
        </p>
        {surface.font ? <ProvenanceChip source={surface.font.source} /> : null}
      </div>
    );
  }

  if (toolId === "buttons") {
    return (
      <div className="space-y-4" data-testid="email-drawer-buttons">
        {model.items.length === 0 ? (
          <p className="text-xs text-white/55">Add a button or offer block to edit CTAs.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1">
              {model.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`email-cta-select-${item.id}`}
                  onClick={() => onSelectCta(item.id)}
                  className={cn(
                    "min-h-9 rounded-md px-2 text-xs",
                    model.selectedItemId === item.id
                      ? "bg-primary/20 text-primary"
                      : "border border-white/10 text-white/70"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {selected && cta ? (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">CTA background</Label>
                    {cta.background ? <ProvenanceChip source={cta.background.source} /> : null}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={(cta.background?.value ?? "#22c55e").slice(0, 7)}
                      onChange={(e) =>
                        onOverrideCta(selected.id, "background", e.target.value)
                      }
                      className="h-9 w-10 rounded border-0"
                      data-testid="email-cta-bg-color"
                      aria-label="CTA background color"
                    />
                    <Input
                      value={cta.background?.value ?? ""}
                      onChange={(e) =>
                        onOverrideCta(selected.id, "background", e.target.value)
                      }
                      className="font-mono text-xs"
                      aria-label="CTA background hex"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[10px]"
                      data-testid="email-cta-reset-bg"
                      onClick={() => onResetCtaProperty(selected.id, "background")}
                    >
                      Reset property to Brand
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[10px]"
                      data-testid="email-cta-reset-item"
                      onClick={() => onResetCtaItem(selected.id)}
                    >
                      Reset CTA to Brand
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-[10px]"
                    data-testid="email-cta-apply-similar"
                    onClick={() =>
                      onApplySimilarCtaBackground(
                        selected.id,
                        cta.background?.value ?? "#22c55e"
                      )
                    }
                  >
                    Apply to similar CTAs
                  </Button>
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    );
  }

  if (toolId === "media") {
    const sectionId = model.selectedSectionId;
    const block = document.blocks?.find((b) => b.id === sectionId);
    const isImageSection = block?.type === "hero_image";
    const imageUrl = isImageSection
      ? String((block.data as { imageUrl?: string }).imageUrl || "")
      : "";
    const mediaAssetId = isImageSection
      ? String((block.data as { mediaAssetId?: string }).mediaAssetId || "")
      : "";
    return (
      <div className="space-y-4" data-testid="email-drawer-media">
        <p className="text-xs text-white/55">
          Shared Brand asset library — not a separate Email media library.
        </p>
        {!isImageSection ? (
          <div
            className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2"
            data-testid="email-media-select-prompt"
          >
            <p className="text-xs text-white/80">
              Select an image section to replace its media.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11 w-full"
              data-testid="email-media-open-outline"
              onClick={() => onOpenOutlineTool?.()}
            >
              Open Outline to choose a section
            </Button>
          </div>
        ) : (
          <>
            <MediaPicker
              label="Hero image"
              value={imageUrl}
              valueAssetId={mediaAssetId || undefined}
              onAssetChange={(asset) => {
                if (!sectionId) return;
                onDocumentChange({
                  blocks: (document.blocks ?? []).map((item) =>
                    item.id === sectionId
                      ? {
                          ...item,
                          data: {
                            ...item.data,
                            imageUrl: asset?.url || "",
                            mediaAssetId: asset?.mediaAssetId,
                          },
                        }
                      : item
                  ),
                });
              }}
              mediaUploadReady={mediaUploadReady}
              stockReady={stockReady}
              campaignId={campaignId}
            />
            <div className="space-y-1.5">
              <Label className="text-xs">Alt text</Label>
              <Input
                value={String((block.data as { altText?: string }).altText || "")}
                onChange={(e) =>
                  onDocumentChange({
                    blocks: (document.blocks ?? []).map((b) =>
                      b.id === sectionId
                        ? { ...b, data: { ...b.data, altText: e.target.value } }
                        : b
                    ),
                  })
                }
                data-testid="email-media-alt-text"
                placeholder="Describe the image for accessibility"
                aria-label="Image alt text"
              />
            </div>
          </>
        )}
      </div>
    );
  }

  if (toolId === "layout") {
    return (
      <div className="space-y-4" data-testid="email-drawer-layout">
        <p className="text-xs text-white/65">
          Email layout uses stacked sections — single column with supported two-column blocks
          that stack on mobile.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={document.showHeader}
            onChange={(e) => onDocumentChange({ showHeader: e.target.checked })}
          />
          Show header
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={document.showLogo}
            onChange={(e) => onDocumentChange({ showLogo: e.target.checked })}
          />
          Show logo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={document.showFooter}
            onChange={(e) => onDocumentChange({ showFooter: e.target.checked })}
          />
          Show footer
        </label>
      </div>
    );
  }

  if (toolId === "subject") {
    return (
      <div className="space-y-4" data-testid="email-drawer-subject">
        <div className="space-y-1.5">
          <Label className="text-xs">Subject</Label>
          <Input
            value={document.subject}
            onChange={(e) => onDocumentChange({ subject: e.target.value })}
            data-testid="email-subject-input"
            aria-label="Subject"
          />
          <p className="text-[10px] text-white/40">{document.subject.length} characters</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Preheader</Label>
          <Input
            value={document.preheader || ""}
            onChange={(e) => onDocumentChange({ preheader: e.target.value })}
            data-testid="email-preheader-input"
            aria-label="Preheader"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">From name</Label>
          <Input
            value={document.fromName || businessName}
            onChange={(e) => onDocumentChange({ fromName: e.target.value })}
            aria-label="From name"
          />
        </div>
        {subjectTips.map((tip, i) => (
          <p key={i} className="text-[10px] text-amber-200/80">
            {tip}
          </p>
        ))}
      </div>
    );
  }

  if (toolId === "audience" || toolId === "readiness") {
    const readiness = audienceReadiness;
    return (
      <div className="space-y-4" data-testid="email-drawer-readiness">
        <p
          className="text-[10px] uppercase tracking-wide text-white/40"
          data-testid="email-eligibility-evidence"
          data-evidence={readiness?.evidence ?? "incomplete"}
        >
          {readiness?.evidence === "authoritative"
            ? "Eligibility · authoritative"
            : "Eligibility · incomplete"}
        </p>
        {readiness?.lines.map((line, i) => (
          <p
            key={i}
            className="text-xs text-white/75"
            data-testid={i === 0 ? "email-readiness-primary-line" : undefined}
          >
            {line}
          </p>
        ))}
        <p className="text-xs text-white/55">{readiness?.providerSummary}</p>
        <p className="text-[10px] text-white/40">{readiness?.sendBlockedReason}</p>
        <p className="text-xs text-primary" data-testid="email-approval-message">
          {emailApprovalHostMessage(document)}
        </p>
        <div
          className={cn(
            "rounded-lg border p-3 text-xs",
            emailReady
              ? "border-sky-500/30 bg-sky-500/10 text-sky-100"
              : "border-amber-500/40 bg-amber-500/10 text-amber-100"
          )}
          data-testid="email-provider-honesty"
          data-adapter={emailReady ? "live" : "mock"}
        >
          <p className="font-medium">
            {emailReady
              ? "Resend is connected."
              : "No email provider is connected — nothing will be sent."}
          </p>
          <p className="mt-1 text-white/70">
            {emailReady
              ? "A verified provider is configured. Live sending stays off in this wave — prepare and approve here first."
              : "This workspace runs on the mock adapter (Resend is not configured). Approving prepares the email locally but never delivers a real message. Connect Resend in Settings to enable live sending later."}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full min-h-11"
          disabled
          data-testid="email-send-disabled"
          title={
            emailReady
              ? "Live send is not enabled in this wave"
              : "No email provider connected — running on the mock adapter"
          }
        >
          {emailReady ? "Send (not available in this wave)" : "Send (no provider — mock adapter)"}
        </Button>
        {onApprove ? (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="flex-1 min-h-11 bg-primary text-primary-foreground"
              data-testid="email-approve-local"
              onClick={onApprove}
            >
              Approve locally
            </Button>
            {onReject ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1 min-h-11"
                data-testid="email-reject-local"
                onClick={onReject}
              >
                Reject
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (toolId === "preview") {
    return (
      <div className="space-y-3" data-testid="email-drawer-preview">
        <Label className="text-xs">Preview mode</Label>
        <div className="flex flex-wrap gap-1">
          {PREVIEW_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              data-testid={`email-preview-mode-${mode}`}
              onClick={() => onPreviewModeChange?.(mode)}
              className={cn(
                "min-h-9 rounded-md px-2 text-[10px]",
                previewMode === mode
                  ? "bg-primary/20 text-primary"
                  : "border border-white/10 text-white/70"
              )}
            >
              {previewModeLabel(mode)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (toolId === "plain_text") {
    return (
      <div className="space-y-4" data-testid="email-drawer-plain-text">
        <p className="text-xs text-white/55">
          Source: {plain.source}
          {plain.stale ? " · may be stale" : ""}
        </p>
        <Textarea
          rows={12}
          value={document.plainTextOverride ?? plain.text}
          onChange={(e) =>
            onDocumentChange({
              plainTextOverride: e.target.value,
              plainTextStale: false,
            })
          }
          className="font-mono text-xs"
          data-testid="email-plain-text-editor"
          aria-label="Plain text email body"
        />
      </div>
    );
  }

  if (toolId === "history") {
    return (
      <div className="space-y-2" data-testid="email-drawer-history">
        <p className="text-xs text-white/55">Session undo/redo — not durable after tab close.</p>
        {historyLabels.length === 0 ? (
          <p className="text-[10px] text-white/40">No actions yet.</p>
        ) : (
          <ul className="space-y-1 text-xs text-white/65">
            {historyLabels.map((label, i) => (
              <li key={`${label}-${i}`}>· {label}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (toolId === "advanced") {
    return (
      <div className="space-y-4" data-testid="email-drawer-advanced">
        <p className="text-xs text-white/55">
          Rendered HTML — compatibility warnings only. Normal hosts should not edit HTML.
        </p>
        {htmlValidation.warnings.map((w, i) => (
          <p key={i} className="text-[10px] text-amber-200">
            {w}
          </p>
        ))}
        <pre
          className="max-h-48 overflow-auto rounded border border-white/10 bg-black/40 p-2 text-[9px] text-white/60"
          data-testid="email-html-output"
        >
          {html.slice(0, 4000)}
          {html.length > 4000 ? "\n…" : ""}
        </pre>
        {legacyPanel ? (
          <div className="border-t border-white/10 pt-4" data-testid="email-legacy-panel">
            <p className="mb-2 text-[10px] uppercase text-white/45">Legacy builder · compatibility</p>
            {legacyPanel}
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}
