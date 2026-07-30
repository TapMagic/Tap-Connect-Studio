"use client";

/**
 * Email live preview — stays mounted while tools switch.
 */

import { cn } from "@/lib/utils";
import type { ContentBlock } from "@/lib/types/campaign";
import type { EmailDocument } from "@/lib/fusion/email/document";
import type { EmailPreviewMode } from "@/lib/fusion/email/compatibility";
import { renderEmailHtml } from "@/lib/fusion/email/html-render";
import { resolvePlainTextForDocument } from "@/lib/fusion/email/plain-text";
import { CreativeDomRenderer } from "@/components/fusion/creative-platform/creative-dom-renderer";
import { CreativeFlowRenderer } from "@/components/fusion/creative-platform/creative-flow-renderer";

export type EmailLivePreviewProps = {
  document: EmailDocument;
  businessName: string;
  logoUrl?: string | null;
  primaryColor?: string;
  previewMode: EmailPreviewMode;
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  previewRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  zoom?: number | "fit";
};

export function EmailLivePreview({
  document,
  businessName,
  logoUrl,
  primaryColor,
  previewMode,
  selectedSectionId,
  onSelectSection,
  previewRefs,
  zoom = 1,
}: EmailLivePreviewProps) {
  const sorted = [...(document.blocks ?? [])].sort((a, b) => a.order - b.order);
  const theme = {
    ...document.visualTheme,
    primaryColor,
  };
  const darkInbox = previewMode === "dark_inbox";
  const imageBlocked = previewMode === "image_blocked";
  const isMobile = previewMode === "mobile";
  const isPlain = previewMode === "plain_text";
  const isInboxList = previewMode === "inbox_list";

  const html = renderEmailHtml({
    template: document,
    businessName,
    logoUrl: document.logoUrl || logoUrl,
    theme,
    darkInbox,
    imageBlocked,
  });

  const plain = resolvePlainTextForDocument(document, businessName);

  const scale = zoom === "fit" ? 1 : zoom;

  if (isInboxList) {
    return (
      <div
        className="mx-auto w-full max-w-md rounded-xl border border-white/10 bg-[#0a0f1a] p-4"
        data-testid="email-inbox-list-preview"
        data-live-surface="true"
      >
        <p className="truncate text-xs text-white/45">
          {document.fromName || businessName}
        </p>
        <p className="truncate text-sm font-semibold text-white">
          {document.subject || "(no subject)"}
        </p>
        <p className="truncate text-xs text-white/55">
          {document.preheader || "No preheader — inbox clients may pull body text instead."}
        </p>
      </div>
    );
  }

  if (isPlain) {
    return (
      <div
        className="mx-auto w-full max-w-lg rounded-xl border border-white/10 bg-[#0a0f1a] p-4 font-mono text-xs text-white/80 whitespace-pre-wrap"
        data-testid="email-plain-text-preview"
        data-live-surface="true"
      >
        {plain.text}
        {plain.stale ? (
          <p className="mt-3 text-amber-300" data-testid="email-plain-text-stale">
            Plain text may be stale after content changes — review or regenerate.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col items-center overflow-auto p-4",
        darkInbox && "bg-[#1a1a1a]"
      )}
      data-testid="email-live-preview"
      data-live-surface="true"
      data-preview-mode={previewMode}
    >
      <div
        className={cn("builder-email transition-transform", isMobile && "scale-[0.85]")}
        style={{ transform: scale !== 1 ? `scale(${scale})` : undefined }}
      >
        <div className="builder-email-chrome">
          <p className="truncate text-[11px] text-slate-400">Subject</p>
          <p className="truncate text-sm font-medium text-slate-100">
            {document.subject || "(no subject)"}
          </p>
          {document.preheader ? (
            <p className="truncate text-[11px] text-slate-500">{document.preheader}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "builder-email-screen",
            isMobile && "max-w-[390px]",
            darkInbox && "bg-[#242424]"
          )}
        >
          <div
            className={cn("email-preview-sheet", darkInbox && "bg-[#242424] text-slate-100")}
            onClick={() => onSelectSection(null)}
            dangerouslySetInnerHTML={
              previewMode === "desktop" || previewMode === "mobile" || darkInbox || imageBlocked
                ? undefined
                : { __html: html }
            }
          >
            {(previewMode === "desktop" ||
              previewMode === "mobile" ||
              darkInbox ||
              imageBlocked) && (
              <>
                {document.showHeader ? (
                  <div className="mb-5 border-b border-slate-200 pb-4 text-center">
                    {document.showLogo && (document.logoUrl || logoUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={document.logoUrl || logoUrl || ""}
                        alt={businessName}
                        className="mx-auto mb-2 max-h-12 max-w-[160px] object-contain"
                      />
                    ) : imageBlocked ? (
                      <div className="mx-auto mb-2 max-h-12 rounded bg-slate-200 px-4 py-3 text-xs text-slate-500">
                        Logo hidden when images are blocked
                      </div>
                    ) : null}
                    <p className="text-sm font-semibold" style={{ color: primaryColor }}>
                      {businessName}
                    </p>
                  </div>
                ) : null}

                {sorted.map((block) => (
                  <div
                    key={block.id}
                    ref={(el) => {
                      if (previewRefs) previewRefs.current[block.id] = el;
                    }}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSection(block.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectSection(block.id);
                      }
                    }}
                    className={cn(
                      "email-preview-block",
                      selectedSectionId === block.id && "email-preview-block-selected",
                      !block.enabled && "opacity-40"
                    )}
                    data-testid={`email-preview-section-${block.id}`}
                  >
                    {selectedSectionId === block.id ? (
                      <span className="email-preview-block-label">{block.label}</span>
                    ) : null}
                    <EmailBlockPreview
                      block={block}
                      primaryColor={primaryColor ?? "#22c55e"}
                      imageBlocked={imageBlocked}
                      darkInbox={darkInbox}
                    />
                  </div>
                ))}

                {document.showFooter ? (
                  <div className="mt-7 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
                    Sent by {businessName} · Powered by Tap The Magic
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmailBlockPreview({
  block,
  primaryColor,
  imageBlocked,
  darkInbox,
}: {
  block: ContentBlock;
  primaryColor: string;
  imageBlocked?: boolean;
  darkInbox?: boolean;
}) {
  const data = block.data as Record<string, unknown>;
  const name = "Alex";
  const textClass = darkInbox ? "text-slate-100" : "text-slate-900";
  const mutedClass = darkInbox ? "text-slate-400" : "text-slate-500";

  switch (block.type) {
    case "creative_section":
      return (
        <CreativeDomRenderer
          document={data.document}
          label={String(data.resourceName || block.label)}
        />
      );
    case "creative_flow":
      return <CreativeFlowRenderer section={data} />;
    case "headline": {
      const align = (data.alignment as string) || "center";
      return (
        <div style={{ textAlign: align as "left" | "center" | "right" }}>
          <h1 className={cn("m-0 text-[22px] font-semibold", textClass)}>
            {String(data.headline || "").replaceAll("{{name}}", name) || "Headline"}
          </h1>
          {data.subheadline ? (
            <p className={cn("mt-2 mb-0", mutedClass)}>
              {String(data.subheadline).replaceAll("{{name}}", name)}
            </p>
          ) : null}
        </div>
      );
    }
    case "rich_text":
      return (
        <p className={cn("m-0 whitespace-pre-wrap", darkInbox ? "text-slate-200" : "text-slate-800")}>
          {String(data.body || "").replaceAll("{{name}}", name)}
        </p>
      );
    case "hero_image": {
      const url = String(data.imageUrl || "");
      const width = Number(data.widthPercent) || 100;
      if (!url || imageBlocked) {
        return (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-xs text-slate-400">
            {imageBlocked ? `[${String(data.altText || "Image")}]` : "Add an image"}
          </div>
        );
      }
      return (
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={String(data.altText || "")}
            style={{ width: `${width}%`, maxWidth: "100%" }}
            className="inline-block rounded-xl"
          />
        </div>
      );
    }
    case "offer_coupon":
      return (
        <div
          className={cn(
            "rounded-2xl border-2 border-dashed p-5 text-center",
            darkInbox ? "bg-slate-800" : "bg-slate-50"
          )}
          style={{ borderColor: primaryColor }}
        >
          <p className={cn("m-0 text-lg font-bold", textClass)}>
            {String(data.title || "Your offer")}
          </p>
          {data.description ? (
            <p className={cn("mt-2 mb-3 text-sm", mutedClass)}>{String(data.description)}</p>
          ) : null}
          {data.code ? (
            <span
              className="inline-block rounded-lg px-4 py-2 text-xl font-extrabold tracking-wider text-slate-950"
              style={{ background: primaryColor }}
            >
              {String(data.code)}
            </span>
          ) : null}
        </div>
      );
    case "banner":
      return (
        <div
          className="rounded-xl px-4 py-3 text-center font-semibold"
          style={{
            background: String(data.backgroundColor || primaryColor),
            color: String(data.textColor || "#0b0f19"),
          }}
        >
          {String(data.text || "Banner")}
        </div>
      );
    case "button_group": {
      const buttons = (data.buttons as { label: string; url: string }[]) ?? [];
      return (
        <div className="space-y-2 text-center">
          {buttons.map((btn, i) => (
            <span
              key={i}
              className="inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-950"
              style={{ background: primaryColor }}
            >
              {btn.label || "Button"}
            </span>
          ))}
        </div>
      );
    }
    case "spacer":
      return <div className="h-5" />;
    default:
      return (
        <p className="text-xs text-slate-400">
          {block.type.replace(/_/g, " ")} · preview
        </p>
      );
  }
}
