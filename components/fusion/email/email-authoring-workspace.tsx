"use client";

/**
 * Email Authoring Workspace — fourth consumer of Adaptive Workspace Shell + Visual Core.
 * Maturity: IMPLEMENTED BUT NOT OWNER-READY.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Redo2, Save, Undo2 } from "lucide-react";
import { nanoid } from "nanoid";
import {
  AdaptiveWorkspaceShell,
  openAdaptiveTool,
} from "@/components/fusion/authoring/adaptive-workspace-shell";
import { EmailVisualDrawer } from "@/components/fusion/email/email-visual-drawer";
import { EmailLivePreview } from "@/components/fusion/email/email-live-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaPicker } from "@/components/media/media-picker";
import {
  applyEmailCtaOverridesToBlocks,
  applyResolvedToEmailTheme,
  buildEmailVisualModel,
  overrideEmailItemProperty,
  overrideEmailSurfaceProperty,
  resetEmailItem,
  resetEmailItemProperty,
  resetEmailSurfaceProperty,
  resetEmailThemeToBrand,
  applyBackgroundToSimilarEmailCtas,
  type EmailVisualModel,
} from "@/lib/fusion/authoring/email-visual-resolve";
import {
  createLabeledHistory,
  pushLabeledHistory,
  redoLabeledHistory,
  undoLabeledHistory,
  type LabeledEditorHistory,
} from "@/lib/fusion/authoring/session-history";
import {
  createShellSnapshot,
  type ToolDrawerMemory,
  type WorkspaceShellSnapshot,
} from "@/lib/fusion/authoring/workspace-shell";
import {
  loadWorkspaceShellState,
  saveWorkspaceShellState,
  snapshotToPersisted,
  SESSION_RESTORE_LABEL,
} from "@/lib/fusion/authoring/workspace-shell-persist";
import {
  EMAIL_AUTHORING_TOOLS,
  ensureDefaultToolRegistries,
  getWorkspaceTool,
} from "@/lib/fusion/authoring/workspace-tools";
import type { BrandKitVisualFields } from "@/lib/fusion/authoring/brand-kit-adapter";
import {
  parseEmailDocument,
  serializeEmailDocument,
  type EmailDocument,
} from "@/lib/fusion/email/document";
import {
  bindEmailToCampaignOffer,
  detectEmailOfferProjectionState,
  refreshEmailOfferFacts,
} from "@/lib/fusion/email/offer-binding";
import { extractAuthoritativeOffer } from "@/lib/fusion/card/offer";
import {
  summarizeEmailAudienceReadiness,
  type AudienceContactSummary,
} from "@/lib/fusion/email/audience-readiness";
import {
  approveEmailLocally,
  rejectEmailLocally,
  emailApprovalHostMessage,
} from "@/lib/fusion/email/approval";
import { markPlainTextStale } from "@/lib/fusion/email/plain-text";
import type { EmailPreviewMode } from "@/lib/fusion/email/compatibility";
import type { BlockType, ContentBlock } from "@/lib/types/campaign";
import { cn } from "@/lib/utils";

ensureDefaultToolRegistries();

const EMAIL_WORKSPACE_ID = "email-authoring";

const EMAIL_BLOCKS: { type: BlockType; label: string; data: Record<string, unknown> }[] = [
  {
    type: "headline",
    label: "Headline",
    data: { headline: "Your offer", subheadline: "", alignment: "center" },
  },
  { type: "rich_text", label: "Text", data: { body: "Hi {{name}},\n\n…" } },
  { type: "hero_image", label: "Image", data: { imageUrl: "", altText: "", widthPercent: 100 } },
  {
    type: "offer_coupon",
    label: "Offer / code",
    data: {
      title: "Special offer",
      description: "Show this code",
      code: "SAVE10",
      lockedUntilContact: false,
    },
  },
  {
    type: "button_group",
    label: "Button",
    data: {
      layout: "stack",
      buttons: [
        {
          id: nanoid(6),
          label: "Visit us",
          url: "https://",
          style: "primary",
          icon: "link",
          fullWidth: true,
        },
      ],
    },
  },
  { type: "spacer", label: "Spacer", data: { height: "md" } },
];

export type EmailAuthoringWorkspaceProps = {
  campaign: {
    id: string;
    title: string;
    status?: string;
    formSettings?: unknown;
    contentBlocks?: unknown;
  };
  businessName: string;
  logoUrl?: string | null;
  brandKit: BrandKitVisualFields;
  primaryColor: string;
  mediaUploadReady: boolean;
  stockReady: boolean;
  emailReady: boolean;
  audienceContacts?: AudienceContactSummary[];
  audienceConsentLoaded?: boolean;
  audienceSuppressionLoaded?: boolean;
};

type EmailDraft = {
  document: EmailDocument;
  visual: EmailVisualModel;
  selectedSectionId: string | null;
};

export function EmailAuthoringWorkspace({
  campaign,
  businessName,
  logoUrl,
  brandKit,
  primaryColor,
  mediaUploadReady,
  stockReady,
  emailReady,
  audienceContacts = [],
  audienceConsentLoaded = false,
  audienceSuppressionLoaded = false,
}: EmailAuthoringWorkspaceProps) {
  const router = useRouter();
  const previewRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pageBlocks = useMemo(
    () => (Array.isArray(campaign.contentBlocks) ? (campaign.contentBlocks as ContentBlock[]) : []),
    [campaign.contentBlocks]
  );

  const initialDoc = useMemo(() => {
    const parsed = parseEmailDocument(
      (campaign.formSettings as { emailResponse?: unknown } | null)?.emailResponse,
      businessName
    );
    const bound = bindEmailToCampaignOffer({
      document: parsed,
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      campaignStatus: campaign.status ?? "DRAFT",
      pageBlocks,
      preservePresentation: true,
    });
    return bound.document;
  }, [campaign.formSettings, campaign.id, campaign.title, campaign.status, businessName, pageBlocks]);

  const restoredShell = useMemo(() => loadWorkspaceShellState(EMAIL_WORKSPACE_ID), []);
  const [shell, setShell] = useState<WorkspaceShellSnapshot>(() =>
    createShellSnapshot(EMAIL_WORKSPACE_ID, {
      workspaceMode: restoredShell.focusMode ? "focus" : "edit",
      shadePreference: restoredShell.shadePreference,
      priorShadeDisplay: restoredShell.priorShadeDisplay || "open",
      focusMode: restoredShell.focusMode,
      dirty: false,
      saved: true,
      selectedToolId: restoredShell.selectedToolId ?? "outline",
      drawerOpen: restoredShell.drawerOpen ?? true,
      drawerSizeMode: restoredShell.drawerSizeMode,
      customDrawerWidthPct: restoredShell.customDrawerWidthPct,
      selectedObjectId: restoredShell.selectedObjectId,
      previewSurface: restoredShell.previewSurface ?? "desktop",
    })
  );
  const [toolMemory, setToolMemory] = useState<Record<string, ToolDrawerMemory>>(
    () => restoredShell.toolMemory ?? {}
  );
  const [sessionRestored] = useState(() => Boolean(restoredShell.sessionDraftRestored));
  const [previewMode, setPreviewMode] = useState<EmailPreviewMode>(
    (restoredShell.previewSurface as EmailPreviewMode) || "desktop"
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [addType, setAddType] = useState<BlockType>("offer_coupon");

  const buildVisual = useCallback(
    (doc: EmailDocument, selectedSectionId: string | null, selectedItemId?: string | null) =>
      buildEmailVisualModel(brandKit, doc.visualTheme, doc.blocks ?? [], {
        selectedSectionId,
        selectedItemId,
        showHeader: doc.showHeader,
        showFooter: doc.showFooter,
        showLogo: doc.showLogo,
        logoUrl: doc.logoUrl || logoUrl || "",
      }),
    [brandKit, logoUrl]
  );

  const initialDraft: EmailDraft = useMemo(
    () => ({
      document: initialDoc,
      visual: buildVisual(initialDoc, restoredShell.selectedObjectId),
      selectedSectionId: restoredShell.selectedObjectId,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [history, setHistory] = useState<LabeledEditorHistory<EmailDraft>>(() =>
    createLabeledHistory(initialDraft)
  );
  const draft = history.present;
  const document = draft.document;
  const visualModel = draft.visual;

  const authoritativeOffer = useMemo(
    () =>
      extractAuthoritativeOffer({
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        campaignStatus: campaign.status ?? "DRAFT",
        blocks: pageBlocks,
        preferBlockId: document.offerBlockId,
      }),
    [campaign.id, campaign.title, campaign.status, pageBlocks, document.offerBlockId]
  );

  const offerState = detectEmailOfferProjectionState({ document, offer: authoritativeOffer });

  const audienceReadiness = summarizeEmailAudienceReadiness({
    audienceLabel: document.audienceLabel,
    contacts: audienceContacts,
    featureEmailEnabled: emailReady !== false,
    approvalState: document.approvalState,
    consentLoaded: audienceConsentLoaded,
    suppressionLoaded: audienceSuppressionLoaded,
  });

  const activeToolId = shell.selectedToolId;
  const selectedSectionId = draft.selectedSectionId;

  const pushDraft = useCallback(
    (next: EmailDraft, label: string) => {
      setHistory((h) => pushLabeledHistory(h, next, label));
      setShell((s) => ({ ...s, dirty: true, saved: false }));
    },
    []
  );

  const patchDocument = useCallback(
    (patch: Partial<EmailDocument>, label: string) => {
      const nextDoc = markPlainTextStale({ ...document, ...patch });
      pushDraft(
        {
          document: nextDoc,
          visual: buildVisual(nextDoc, selectedSectionId, visualModel.selectedItemId),
          selectedSectionId,
        },
        label
      );
    },
    [document, buildVisual, selectedSectionId, visualModel.selectedItemId, pushDraft]
  );

  const setSelectedSection = useCallback(
    (id: string | null) => {
      pushDraft(
        {
          ...draft,
          selectedSectionId: id,
          visual: { ...visualModel, selectedSectionId: id },
        },
        "Select section"
      );
      setShell((s) => ({ ...s, selectedObjectId: id }));
    },
    [draft, visualModel, pushDraft]
  );

  const patchVisual = useCallback(
    (nextVisual: EmailVisualModel, label: string) => {
      const theme = applyResolvedToEmailTheme(nextVisual);
      const blocks = applyEmailCtaOverridesToBlocks(nextVisual, document.blocks ?? []);
      const nextDoc: EmailDocument = markPlainTextStale({
        ...document,
        visualTheme: theme,
        blocks,
      });
      pushDraft(
        {
          document: nextDoc,
          visual: nextVisual,
          selectedSectionId,
        },
        label
      );
    },
    [document, selectedSectionId, pushDraft]
  );

  useEffect(() => {
    saveWorkspaceShellState(
      snapshotToPersisted(shell, toolMemory, { sessionDraftRestored: sessionRestored })
    );
  }, [shell, toolMemory, sessionRestored]);

  useEffect(() => {
    if (!selectedSectionId) return;
    previewRefs.current[selectedSectionId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedSectionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.document.title = `${document.approvalState === "approved" ? "✓ " : shell.dirty ? "• " : ""}${document.subject || "Email"} · Tap Connect`;
  }, [document.subject, document.approvalState, shell.dirty]);

  function openEmailTool(toolId: string) {
    setShell((s) => {
      if (s.selectedToolId === toolId && s.drawerOpen) {
        return { ...s, drawerOpen: false };
      }
      const { snapshot, memory: nextMemory } = openAdaptiveTool(
        s,
        EMAIL_WORKSPACE_ID,
        toolId,
        toolMemory
      );
      setToolMemory(nextMemory);
      return snapshot;
    });
  }

  async function saveEmail() {
    setSaving(true);
    setMessage(null);
    const payload = serializeEmailDocument(document);
    const res = await fetch("/api/campaigns/assign", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: campaign.id,
        formSettings: {
          ...((campaign.formSettings && typeof campaign.formSettings === "object"
            ? campaign.formSettings
            : {}) as object),
          emailResponse: payload,
        },
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage("Save failed — try again.");
      return;
    }
    setMessage("Email draft saved.");
    setShell((s) => ({ ...s, dirty: false, saved: true }));
    router.refresh();
  }

  function undo() {
    setHistory((h) => {
      const next = undoLabeledHistory(h);
      return next ?? h;
    });
    setShell((s) => ({ ...s, dirty: true }));
  }

  function redo() {
    setHistory((h) => {
      const next = redoLabeledHistory(h);
      return next ?? h;
    });
    setShell((s) => ({ ...s, dirty: true }));
  }

  function addBlock() {
    const preset = EMAIL_BLOCKS.find((b) => b.type === addType) ?? EMAIL_BLOCKS[0];
    const id = nanoid(8);
    const order = document.blocks?.length
      ? Math.max(...document.blocks.map((b) => b.order)) + 1
      : 0;
    const blocks = [
      ...(document.blocks ?? []),
      {
        id,
        type: preset.type,
        label: preset.label,
        order,
        enabled: true,
        channel: "email" as const,
        data: structuredClone(preset.data),
      },
    ];
    patchDocument({ blocks }, "Add block");
    setSelectedSection(id);
  }

  function patchBlockData(id: string, key: string, value: unknown) {
    const blocks = (document.blocks ?? []).map((b) =>
      b.id === id ? { ...b, data: { ...b.data, [key]: value } } : b
    );
    patchDocument({ blocks }, "Edit block");
  }

  const sorted = [...(document.blocks ?? [])].sort((a, b) => a.order - b.order);
  const selectedBlock = sorted.find((b) => b.id === selectedSectionId) ?? null;

  const recommendedDrawerMode =
    (activeToolId && getWorkspaceTool(EMAIL_WORKSPACE_ID, activeToolId)?.recommendedDrawerMode) ||
    "balanced";

  const activeToolLabel =
    (activeToolId && getWorkspaceTool(EMAIL_WORKSPACE_ID, activeToolId)?.label) || "Tools";

  const shellForUi = shell;

  return (
    <div
      className="email-authoring-shell email-zone-glow flex h-[calc(100vh-4rem)] flex-col"
      data-testid="email-authoring-workspace"
      data-adaptive-shell="v1"
      data-shell-consumer="email-authoring"
      data-resolver="shared-visual-core-v0"
      data-editor-ready="true"
    >
      {sessionRestored ? (
        <p className="sr-only" role="status" data-testid="email-session-restore-notice">
          {SESSION_RESTORE_LABEL}
        </p>
      ) : null}
      {message ? (
        <p className="border-b border-white/10 px-4 py-2 text-sm text-primary">{message}</p>
      ) : null}
      {offerState === "stale" ? (
        <p
          className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-100"
          data-testid="email-global-stale-warning"
        >
          The Campaign offer changed. Review this email before using it.
        </p>
      ) : null}

      <AdaptiveWorkspaceShell
        identity={{
          id: EMAIL_WORKSPACE_ID,
          label: document.subject || "Email",
          objectLabel: `${campaign.title} · ${document.approvalState || "draft"}`,
          zone: "email",
        }}
        snapshot={shellForUi}
        onSnapshotChange={setShell}
        toolMemory={toolMemory}
        onToolMemoryChange={setToolMemory}
        recommendedDrawerMode={recommendedDrawerMode}
        zoneClassName="email-zone-glow"
        drawerTitle={activeToolLabel}
        drawerRootTestId="email-contextual-drawer"
        desktopDrawerCloseTestId="email-drawer-collapse"
        mobileDrawerCloseTestId="email-drawer-collapse"
        mobileSheetTestId="email-mobile-sheet"
        primaryAction={
          <Button
            className="inline-flex min-h-11 items-center bg-primary px-3 text-primary-foreground"
            data-testid="email-save"
            onClick={() => void saveEmail()}
            disabled={saving}
          >
            <Save className="mr-1 h-4 w-4" />
            {saving ? "Saving…" : "Save"}
          </Button>
        }
        returnAction={
          <Link
            href={`/dashboard/campaigns/${campaign.id}`}
            className="inline-flex min-h-11 items-center rounded-md border border-white/20 px-2.5 text-xs text-white/85 hover:bg-white/5"
            data-testid="email-return-studio"
          >
            Return to Studio
          </Link>
        }
        shadeExtras={
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden items-center gap-1 text-xs text-sky-200/80 sm:inline-flex">
              <Mail className="h-3.5 w-3.5" />
              {emailApprovalHostMessage(document)}
            </span>
            <Button
              variant="outline"
              className="inline-flex min-h-11 min-w-11 items-center justify-center"
              onClick={undo}
              disabled={history.past.length === 0}
              data-testid="email-undo"
              aria-label="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="inline-flex min-h-11 min-w-11 items-center justify-center"
              onClick={redo}
              disabled={history.future.length === 0}
              data-testid="email-redo"
              aria-label="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              className="inline-flex min-h-11 items-center bg-primary px-3 text-primary-foreground"
              data-testid="email-review"
              onClick={() => openEmailTool("readiness")}
            >
              Review
            </Button>
            <a
              href={`/dashboard/campaigns/${campaign.id}/email`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-md border border-primary/35 bg-primary/10 px-2.5 text-xs font-medium text-primary"
              data-testid="email-open-detached"
            >
              Open in new tab ↗
            </a>
          </div>
        }
        previewControls={
          <div className="flex flex-wrap gap-1">
            {(["desktop", "mobile", "dark_inbox"] as EmailPreviewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                data-testid={`email-shade-preview-${mode}`}
                onClick={() => setPreviewMode(mode)}
                className={cn(
                  "min-h-9 rounded-md px-2 text-[10px]",
                  previewMode === mode
                    ? "bg-primary/20 text-primary"
                    : "border border-white/10 text-white/70"
                )}
              >
                {mode.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        }
        outline={
          <div className="space-y-2 p-2" data-testid="email-tool-rail">
            {EMAIL_AUTHORING_TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                data-testid={`email-tool-${tool.id}`}
                onClick={() => openEmailTool(tool.id)}
                className={cn(
                  "flex min-h-11 w-full items-center rounded-md px-3 text-left text-xs",
                  activeToolId === tool.id
                    ? "bg-primary/20 text-primary"
                    : "text-white/70 hover:bg-white/5"
                )}
              >
                {tool.label}
              </button>
            ))}
          </div>
        }
        mobileToolRail={
          <div
            className="relative z-50 flex shrink-0 gap-1 overflow-x-auto border-t border-white/10 bg-[#050814] p-2 lg:hidden"
            data-testid="email-mobile-toolbar"
            role="toolbar"
            aria-label="Email tools"
          >
            {EMAIL_AUTHORING_TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                data-testid={`email-mobile-tool-${tool.id}`}
                onClick={() => openEmailTool(tool.id)}
                className={cn(
                  "min-h-11 shrink-0 rounded-md px-3 text-xs",
                  activeToolId === tool.id
                    ? "bg-primary/20 text-primary"
                    : "border border-white/10 text-white/70"
                )}
              >
                {tool.label}
              </button>
            ))}
          </div>
        }
        drawerContent={
          <EmailVisualDrawer
            toolId={activeToolId}
            model={visualModel}
            document={document}
            businessName={businessName}
            campaignTitle={campaign.title}
            campaignId={campaign.id}
            logoUrl={logoUrl}
            primaryColor={primaryColor}
            historyLabels={history.past.map((p) => p.label)}
            mediaUploadReady={mediaUploadReady}
            stockReady={stockReady}
            audienceReadiness={audienceReadiness}
            offerState={offerState}
            previewMode={previewMode}
            onPreviewModeChange={setPreviewMode}
            onOverrideSurface={(key, value) =>
              patchVisual(overrideEmailSurfaceProperty(visualModel, key, value), `Color ${key}`)
            }
            onResetSurface={(key) =>
              patchVisual(resetEmailSurfaceProperty(visualModel, key), `Reset ${key}`)
            }
            onResetThemeToBrand={() =>
              patchVisual(resetEmailThemeToBrand(visualModel), "Reset theme to Brand")
            }
            onOverrideCta={(itemId, key, value) =>
              patchVisual(
                overrideEmailItemProperty(visualModel, itemId, key, value),
                "CTA override"
              )
            }
            onResetCtaProperty={(itemId, key) =>
              patchVisual(resetEmailItemProperty(visualModel, itemId, key), "Reset CTA property")
            }
            onResetCtaItem={(itemId) =>
              patchVisual(resetEmailItem(visualModel, itemId), "Reset CTA to Brand")
            }
            onSelectCta={(itemId) =>
              pushDraft(
                { ...draft, visual: { ...visualModel, selectedItemId: itemId } },
                "Select CTA"
              )
            }
            onApplySimilarCtaBackground={(itemId, value) =>
              patchVisual(
                applyBackgroundToSimilarEmailCtas(visualModel, itemId, value),
                "Apply CTA background"
              )
            }
            onDocumentChange={(patch) => patchDocument(patch, "Edit email")}
            onApprove={() => patchDocument(approveEmailLocally(document), "Approve locally")}
            onReject={() => patchDocument(rejectEmailLocally(document), "Reject")}
            onRefreshOffer={() => {
              if (!authoritativeOffer) return;
              patchDocument(
                refreshEmailOfferFacts({
                  document,
                  offer: authoritativeOffer,
                  preservePresentation: true,
                }),
                "Refresh offer facts"
              );
            }}
            onOpenOutlineTool={() => openEmailTool("outline")}
            onMediaChange={(sectionId, imageUrl) => {
              const blocks = (document.blocks ?? []).map((b) =>
                b.id === sectionId
                  ? { ...b, data: { ...b.data, imageUrl } }
                  : b
              );
              patchDocument({ blocks }, "Replace image");
            }}
            blockOutline={
              <div className="space-y-1">
                {sorted.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    data-testid={`email-outline-block-${block.id}`}
                    onClick={() => setSelectedSection(block.id)}
                    className={cn(
                      "w-full rounded-md px-2 py-1.5 text-left text-xs",
                      selectedSectionId === block.id
                        ? "bg-primary/20 text-primary"
                        : "text-white/65 hover:bg-white/5"
                    )}
                  >
                    {block.label}
                  </button>
                ))}
              </div>
            }
            contentEditor={
              <div className="space-y-3">
                <div className="flex gap-2">
                  <select
                    className="h-9 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 text-xs"
                    value={addType}
                    onChange={(e) => setAddType(e.target.value as BlockType)}
                    aria-label="Add email block type"
                  >
                    {EMAIL_BLOCKS.map((b) => (
                      <option key={b.type} value={b.type}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                  <Button type="button" size="sm" onClick={addBlock}>
                    Add
                  </Button>
                </div>
                {selectedBlock ? (
                  <div className="space-y-2 border-t border-white/10 pt-3">
                    <Label className="text-xs">Edit: {selectedBlock.label}</Label>
                    {selectedBlock.type === "headline" && (
                      <>
                        <Input
                          value={(selectedBlock.data as { headline?: string }).headline ?? ""}
                          onChange={(e) =>
                            patchBlockData(selectedBlock.id, "headline", e.target.value)
                          }
                        />
                        <Input
                          value={(selectedBlock.data as { subheadline?: string }).subheadline ?? ""}
                          onChange={(e) =>
                            patchBlockData(selectedBlock.id, "subheadline", e.target.value)
                          }
                        />
                      </>
                    )}
                    {selectedBlock.type === "rich_text" && (
                      <Textarea
                        rows={5}
                        value={(selectedBlock.data as { body?: string }).body ?? ""}
                        onChange={(e) => patchBlockData(selectedBlock.id, "body", e.target.value)}
                      />
                    )}
                    {selectedBlock.type === "hero_image" && (
                      <MediaPicker
                        label="Image"
                        value={(selectedBlock.data as { imageUrl?: string }).imageUrl ?? ""}
                        onChange={(url) => patchBlockData(selectedBlock.id, "imageUrl", url)}
                        mediaUploadReady={mediaUploadReady}
                        stockReady={stockReady}
                        campaignId={campaign.id}
                      />
                    )}
                    {selectedBlock.type === "offer_coupon" && (
                      <>
                        <Input
                          value={(selectedBlock.data as { title?: string }).title ?? ""}
                          onChange={(e) => patchBlockData(selectedBlock.id, "title", e.target.value)}
                          placeholder="Presentation title"
                        />
                        <p className="text-[10px] text-white/40">
                          Authoritative offer facts come from Campaign — presentation may differ.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-white/45">Select a section in the preview.</p>
                )}
              </div>
            }
          />
        }
        canvas={
          <div className="flex h-full min-h-0 flex-col" data-testid="email-live-canvas">
            <EmailLivePreview
              document={document}
              businessName={businessName}
              logoUrl={logoUrl}
              primaryColor={primaryColor}
              previewMode={previewMode}
              selectedSectionId={selectedSectionId}
              onSelectSection={setSelectedSection}
              previewRefs={previewRefs}
              zoom={shell.previewZoom}
            />
          </div>
        }
      />
    </div>
  );
}

/** Backward-compatible export name */
export const CampaignEmailBuilder = EmailAuthoringWorkspace;
