"use client";

/**
 * Email Authoring Workspace — fourth consumer of Adaptive Workspace Shell + Visual Core.
 * Maturity: IMPLEMENTED BUT NOT OWNER-READY.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Lock,
  Mail,
  CalendarClock,
  MoreHorizontal,
  Redo2,
  Save,
  Trash2,
  Undo2,
  Unlock,
} from "lucide-react";
import { nanoid } from "nanoid";
import {
  AdaptiveWorkspaceShell,
  openAdaptiveTool,
} from "@/components/fusion/authoring/adaptive-workspace-shell";
import { EmailVisualDrawer } from "@/components/fusion/email/email-visual-drawer";
import { EmailLivePreview } from "@/components/fusion/email/email-live-preview";
import { CardRelationshipAnchor } from "@/components/fusion/card/card-relationship-anchor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaPicker } from "@/components/media/media-picker";
import { ReusableDesignBrowser } from "@/components/fusion/creative-studio/reusable-design-browser";
import { CreativeFlowSectionEditor } from "@/components/fusion/creative-platform/creative-flow-section-editor";
import type {
  CreativeFlowSection,
  CreativeRenderDocument,
} from "@/lib/fusion/creative-platform/model";
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
import { CampaignReplyHandlingSection } from "@/components/fusion/email-replies/campaign-reply-handling-section";
import { canLiveSend } from "@/lib/fusion/email/approval";
import type { CampaignReplyHandlingOverride } from "@/lib/fusion/email-replies/types";
import { markPlainTextStale } from "@/lib/fusion/email/plain-text";
import type { EmailPreviewMode } from "@/lib/fusion/email/compatibility";
import type { BlockType, ContentBlock } from "@/lib/types/campaign";
import { cn } from "@/lib/utils";

ensureDefaultToolRegistries();

const EMAIL_WORKSPACE_ID = "email-authoring";

const EMAIL_BLOCKS: { type: BlockType; label: string; data: Record<string, unknown> }[] = [
  {
    type: "creative_section",
    label: "Reusable creative section",
    data: { document: null, resourceRef: null },
  },
  {
    type: "creative_flow",
    label: "Image + text layout",
    data: {
      schemaVersion: 1,
      layout: "image_left",
      image: { mediaAssetId: "", fallbackUrl: "" },
      heading: "Your story",
      body: "A responsive image and text section.",
      gutterPx: 24,
      imageWidthPercent: 45,
      alignment: "center",
      mobileStack: "image_first",
      background: { kind: "solid", color: "#ffffff" },
    },
  },
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
  emailRecord?: {
    id: string;
    status: string;
    draftRevision: number;
    document: unknown;
    scheduledFor?: string | null;
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
  cardRelationship?: import("@/lib/fusion/studio/card-relationship").CardRelationshipContext | null;
};

type EmailDraft = {
  document: EmailDocument;
  visual: EmailVisualModel;
  selectedSectionId: string | null;
};

export function EmailAuthoringWorkspace({
  campaign,
  emailRecord,
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
  cardRelationship = null,
}: EmailAuthoringWorkspaceProps) {
  const router = useRouter();
  const previewRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pageBlocks = useMemo(
    () => (Array.isArray(campaign.contentBlocks) ? (campaign.contentBlocks as ContentBlock[]) : []),
    [campaign.contentBlocks]
  );
  const canonicalEmail = useMemo(() => emailRecord ?? {
    id: campaign.id,
    status: "DRAFT",
    draftRevision: 1,
    document: (campaign.formSettings as { emailResponse?: unknown } | null)?.emailResponse,
    scheduledFor: null,
  }, [emailRecord, campaign.id, campaign.formSettings]);

  const initialDoc = useMemo(() => {
    const parsed = parseEmailDocument(canonicalEmail.document, businessName);
    const bound = bindEmailToCampaignOffer({
      document: parsed,
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      campaignStatus: campaign.status ?? "DRAFT",
      pageBlocks,
      preservePresentation: true,
    });
    return bound.document;
  }, [canonicalEmail.document, campaign.id, campaign.title, campaign.status, businessName, pageBlocks]);

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
  const [draftRevision, setDraftRevision] = useState(canonicalEmail.draftRevision);
  const [emailStatus, setEmailStatus] = useState(canonicalEmail.status);
  const [scheduledFor, setScheduledFor] = useState(
    canonicalEmail.scheduledFor ? canonicalEmail.scheduledFor.slice(0, 16) : "",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [addType, setAddType] = useState<BlockType>("offer_coupon");
  const [outlineDragId, setOutlineDragId] = useState<string | null>(null);
  const [outlineDropId, setOutlineDropId] = useState<string | null>(null);
  const [outlineMenuId, setOutlineMenuId] = useState<string | null>(null);

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
    const res = await fetch("/api/email", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailId: canonicalEmail.id,
        expectedRevision: draftRevision,
        document: payload,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const result = await res.json().catch(() => ({})) as { error?: string };
      setMessage(result.error ?? "Save failed — try again.");
      return;
    }
    const result = await res.json() as { email?: { draftRevision?: number; status?: string } };
    if (result.email?.draftRevision) setDraftRevision(result.email.draftRevision);
    if (result.email?.status) setEmailStatus(result.email.status);
    setMessage("Email draft saved.");
    setShell((s) => ({ ...s, dirty: false, saved: true }));
    router.refresh();
  }

  async function scheduleFixture() {
    if (shell.dirty) {
      setMessage("Save this Email draft before scheduling.");
      return;
    }
    if (!scheduledFor) {
      setMessage("Choose a fixture schedule time.");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "schedule-fixture",
        emailId: canonicalEmail.id,
        scheduledFor: new Date(scheduledFor).toISOString(),
      }),
    });
    const result = await response.json().catch(() => ({})) as { error?: string; status?: string };
    setSaving(false);
    if (!response.ok) {
      setMessage(result.error ?? "Schedule failed.");
      return;
    }
    setEmailStatus("SCHEDULED");
    setMessage("Scheduled safely. No real Email will be sent.");
    router.refresh();
  }

  async function exerciseFixtureBlock() {
    setSaving(true);
    const response = await fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "execute-fixture", emailId: canonicalEmail.id }),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setMessage(result.error ?? "Fixture operation failed.");
      return;
    }
    setEmailStatus("BLOCKED");
    setMessage("Blocked safely. No provider or recipient was contacted.");
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
    const nextDocument = markPlainTextStale({ ...document, blocks });
    pushDraft(
      {
        document: nextDocument,
        visual: buildVisual(nextDocument, id, visualModel.selectedItemId),
        selectedSectionId: id,
      },
      `Added ${preset.label}`
    );
    setShell((current) => ({
      ...current,
      dirty: true,
      saved: false,
      selectedObjectId: id,
    }));
  }

  function patchBlockData(id: string, key: string, value: unknown) {
    const blocks = (document.blocks ?? []).map((b) =>
      b.id === id && !b.locked ? { ...b, data: { ...b.data, [key]: value } } : b
    );
    patchDocument({ blocks }, "Edit block");
  }

  const sorted = [...(document.blocks ?? [])].sort((a, b) => a.order - b.order);
  const selectedBlock = sorted.find((b) => b.id === selectedSectionId) ?? null;

  function commitOrderedBlocks(blocks: ContentBlock[], label: string) {
    patchDocument(
      { blocks: blocks.map((block, index) => ({ ...block, order: index })) },
      label
    );
  }

  function moveEmailBlock(id: string, destination: number) {
    const from = sorted.findIndex((block) => block.id === id);
    if (from < 0) return;
    if (sorted[from]?.locked) {
      setMessage("Unlock this Email block before moving it.");
      return;
    }
    const to = Math.max(0, Math.min(sorted.length - 1, destination));
    if (from === to) return;
    const next = [...sorted];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    commitOrderedBlocks(next, `Moved ${item.label}`);
  }

  function reorderEmailBlocks(fromId: string, toId: string) {
    const to = sorted.findIndex((block) => block.id === toId);
    if (to >= 0) moveEmailBlock(fromId, to);
  }

  function patchEmailBlock(id: string, patch: Partial<ContentBlock>, label: string) {
    patchDocument(
      { blocks: sorted.map((block) => (block.id === id ? { ...block, ...patch } : block)) },
      label
    );
  }

  function duplicateEmailBlock(id: string) {
    const index = sorted.findIndex((block) => block.id === id);
    const source = sorted[index];
    if (!source || source.locked) return;
    const clone: ContentBlock = {
      ...structuredClone(source),
      id: nanoid(8),
      label: `${source.label} copy`,
    };
    const next = [...sorted];
    next.splice(index + 1, 0, clone);
    commitOrderedBlocks(next, `Duplicated ${source.label}`);
  }

  function deleteEmailBlock(id: string) {
    const source = sorted.find((block) => block.id === id);
    if (!source || source.locked) return;
    commitOrderedBlocks(
      sorted.filter((block) => block.id !== id),
      `Deleted ${source.label}`
    );
    if (selectedSectionId === id) setSelectedSection(null);
  }

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
      {cardRelationship ? (
        <CardRelationshipAnchor
          card={cardRelationship}
          role="email_return"
          extras={
            <>
              <span data-testid="email-parent-campaign">Campaign · {campaign.title}</span>
              <span data-testid="email-offer-freshness">
                {offerState === "stale"
                  ? "Offer freshness · stale"
                  : offerState === "current"
                    ? "Offer freshness · current"
                    : `Offer · ${offerState}`}
              </span>
              <span data-testid="email-reply-handling-state">
                Reply handling · {document.replyHandling?.mode || "default"}
              </span>
              <span data-testid="email-local-approval-state">
                Approval · {document.approvalState || "draft"}
              </span>
              <span data-testid="email-no-send-state" data-adapter={emailReady ? "live" : "mock"}>
                {emailReady ? "No live send (this wave)" : "No live send · mock adapter"}
              </span>
            </>
          }
        />
      ) : null}
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
            <span className="rounded-md border border-white/15 px-2 py-1 text-xs" data-testid="email-lifecycle-status">
              {emailStatus === "LIVE" ? "Active" : emailStatus.charAt(0) + emailStatus.slice(1).toLowerCase().replaceAll("_", " ")}
            </span>
            <label className="flex items-center gap-1 text-xs text-white/65">
              <span className="sr-only">Fixture schedule</span>
              <input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} className="min-h-10 rounded-md border border-white/15 bg-black/20 px-2" data-testid="email-schedule-time" />
            </label>
            <Button variant="outline" className="min-h-11" disabled={saving || shell.dirty} onClick={() => void scheduleFixture()} data-testid="email-schedule-fixture">
              <CalendarClock className="mr-1 h-4 w-4" /> Schedule
            </Button>
            {emailStatus === "SCHEDULED" ? (
              <Button variant="outline" className="min-h-11" disabled={saving} onClick={() => void exerciseFixtureBlock()} data-testid="email-execute-fixture">
                Exercise safe operation
              </Button>
            ) : null}
            <span className="hidden items-center gap-1 text-xs text-sky-200/80 sm:inline-flex">
              <Mail className="h-3.5 w-3.5" />
              {emailApprovalHostMessage(document)}
            </span>
            <Button
              variant="outline"
              className="inline-flex min-h-11 items-center justify-center px-3"
              onClick={undo}
              disabled={history.past.length === 0}
              data-testid="email-undo"
              aria-label="Undo"
            >
              <Undo2 className="h-4 w-4" />
              <span className="ml-1.5">
                {history.past[0]?.label ? `Undo ${history.past[0].label}` : "Undo change"}
              </span>
            </Button>
            <Button
              variant="outline"
              className="inline-flex min-h-11 items-center justify-center px-3"
              onClick={redo}
              disabled={history.future.length === 0}
              data-testid="email-redo"
              aria-label="Redo"
            >
              <Redo2 className="h-4 w-4" />
              <span className="ml-1.5">
                {history.future[0]?.label ? `Redo ${history.future[0].label}` : "Redo change"}
              </span>
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
            {EMAIL_AUTHORING_TOOLS.filter(
              (t) => !["advanced", "plain_text", "history"].includes(t.id)
            ).map((tool) => (
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
            <details
              className="rounded-md border border-white/8 px-2 py-1.5"
              data-testid="email-technical-tools"
              data-default-collapsed="true"
            >
              <summary className="cursor-pointer text-[11px] text-white/45">
                Technical · HTML / compatibility / Advanced
              </summary>
              <div className="mt-1 space-y-1">
                {EMAIL_AUTHORING_TOOLS.filter((t) =>
                  ["plain_text", "history", "advanced"].includes(t.id)
                ).map((tool) => (
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
            </details>
            <div className="space-y-2 border-t border-white/10 pt-3" data-testid="email-outline-blocks">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
                  Email blocks
                </p>
                <p className="mt-1 text-[11px] text-white/40">
                  Drag the grip or use Alt/⌘ + arrow. Eye, lock, and more actions remain visible.
                </p>
              </div>
              {sorted.map((block, index) => (
                <div
                  key={block.id}
                  className={cn(
                    "relative rounded-lg border px-1.5 py-1.5",
                    selectedSectionId === block.id
                      ? "border-primary/60 bg-primary/10"
                      : "border-white/10 bg-white/[0.02]",
                    !block.enabled && "opacity-55",
                    outlineDragId === block.id && "opacity-50",
                    outlineDragId &&
                      outlineDropId === block.id &&
                      outlineDragId !== block.id &&
                      "border-primary/80 before:absolute before:-top-1 before:left-2 before:right-2 before:h-0.5 before:bg-primary"
                  )}
                  data-testid={`email-outline-row-${block.id}`}
                  data-block-visible={block.enabled ? "true" : "false"}
                  data-block-locked={block.locked ? "true" : "false"}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setOutlineDropId(block.id);
                  }}
                  onDrop={() => {
                    if (outlineDragId) reorderEmailBlocks(outlineDragId, block.id);
                    setOutlineDragId(null);
                    setOutlineDropId(null);
                  }}
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      draggable
                      aria-label={`Drag to reorder ${block.label}`}
                      data-testid={`email-block-drag-${block.id}`}
                      className="inline-flex h-9 w-8 shrink-0 cursor-grab items-center justify-center rounded border border-white/10 bg-white/[0.04] text-white/75 active:cursor-grabbing"
                      onDragStart={(event) => {
                        if (block.locked) {
                          event.preventDefault();
                          setMessage("Unlock this Email block before moving it.");
                          return;
                        }
                        event.dataTransfer.setData("text/plain", block.id);
                        setOutlineDragId(block.id);
                      }}
                      onDragEnd={() => {
                        setOutlineDragId(null);
                        setOutlineDropId(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowUp" && (event.altKey || event.metaKey)) {
                          event.preventDefault();
                          moveEmailBlock(block.id, index - 1);
                        }
                        if (event.key === "ArrowDown" && (event.altKey || event.metaKey)) {
                          event.preventDefault();
                          moveEmailBlock(block.id, index + 1);
                        }
                      }}
                    >
                      <GripVertical className="h-5 w-5" aria-hidden />
                    </button>
                    <Layers className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate px-1 text-left text-xs font-medium text-white/90"
                      onClick={() => setSelectedSection(block.id)}
                    >
                      {block.label}
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 w-8 items-center justify-center rounded text-white/60 hover:bg-white/5"
                      aria-label={block.enabled ? `Hide ${block.label}` : `Show ${block.label}`}
                      data-testid={`email-block-visibility-${block.id}`}
                      onClick={() =>
                        patchEmailBlock(
                          block.id,
                          { enabled: !block.enabled },
                          `${block.enabled ? "Hid" : "Showed"} ${block.label}`
                        )
                      }
                    >
                      {block.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 w-8 items-center justify-center rounded text-white/60 hover:bg-white/5"
                      aria-label={block.locked ? `Unlock ${block.label}` : `Lock ${block.label}`}
                      data-testid={`email-block-lock-${block.id}`}
                      onClick={() =>
                        patchEmailBlock(
                          block.id,
                          { locked: !block.locked },
                          `${block.locked ? "Unlocked" : "Locked"} ${block.label}`
                        )
                      }
                    >
                      {block.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        className="inline-flex h-9 w-8 items-center justify-center rounded text-white/60 hover:bg-white/5"
                        aria-label={`More actions for ${block.label}`}
                        data-testid={`email-block-menu-${block.id}`}
                        onClick={() =>
                          setOutlineMenuId((current) => (current === block.id ? null : block.id))
                        }
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {outlineMenuId === block.id ? (
                        <div
                          role="menu"
                          className="absolute right-0 top-full z-30 mt-1 min-w-44 rounded-lg border border-white/15 bg-[#0c1220] py-1 shadow-2xl"
                        >
                          {[
                            ["Move up", () => moveEmailBlock(block.id, index - 1), index === 0],
                            [
                              "Move down",
                              () => moveEmailBlock(block.id, index + 1),
                              index === sorted.length - 1,
                            ],
                            ["Move to top", () => moveEmailBlock(block.id, 0), index === 0],
                            [
                              "Move to bottom",
                              () => moveEmailBlock(block.id, sorted.length - 1),
                              index === sorted.length - 1,
                            ],
                          ].map(([label, action, disabled]) => (
                            <button
                              key={String(label)}
                              type="button"
                              role="menuitem"
                              disabled={Boolean(disabled) || block.locked}
                              className="block w-full px-3 py-2 text-left text-xs text-white/85 hover:bg-white/5 disabled:opacity-35"
                              onClick={() => {
                                setOutlineMenuId(null);
                                (action as () => void)();
                              }}
                            >
                              {String(label)}
                            </button>
                          ))}
                          <div className="my-1 border-t border-white/10" />
                          <button
                            type="button"
                            role="menuitem"
                            disabled={block.locked}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/85 hover:bg-white/5 disabled:opacity-35"
                            onClick={() => {
                              setOutlineMenuId(null);
                              duplicateEmailBlock(block.id);
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" /> Duplicate
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            disabled={block.locked}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-300 hover:bg-white/5 disabled:opacity-35"
                            onClick={() => {
                              setOutlineMenuId(null);
                              deleteEmailBlock(block.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <p className="pl-[4.75rem] text-[10px] text-white/40">
                    {block.type.replaceAll("_", " ")}
                  </p>
                </div>
              ))}
            </div>
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
            emailReady={emailReady}
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
                    {selectedBlock.type === "creative_section" && (
                      <ReusableDesignBrowser
                        kind="COMPOSITION"
                        value={
                          (selectedBlock.data as { document?: CreativeRenderDocument })
                            .document
                        }
                        title="Reusable creative sections"
                        onInsert={(creativeDocument, _label, resource) =>
                          patchDocument(
                            {
                              blocks: (document.blocks ?? []).map((block) =>
                                block.id === selectedBlock.id
                                  ? {
                                      ...block,
                                      data: {
                                        document: creativeDocument,
                                        resourceName: resource.name,
                                        resourceRef: {
                                          resourceId: resource.id,
                                          revisionId: resource.currentRevision?.id,
                                          resourceName: resource.name,
                                        },
                                      },
                                    }
                                  : block
                              ),
                            },
                            "Inserted reusable creative section"
                          )
                        }
                      />
                    )}
                    {selectedBlock.type === "creative_flow" && (
                      <div className="space-y-3">
                        <CreativeFlowSectionEditor
                          value={
                            selectedBlock.data as Partial<CreativeFlowSection> &
                              Record<string, unknown>
                          }
                          mediaUploadReady={mediaUploadReady}
                          stockReady={stockReady}
                          onChange={(next, label) =>
                            patchDocument(
                              {
                                blocks: (document.blocks ?? []).map((block) =>
                                  block.id === selectedBlock.id
                                    ? { ...block, data: next }
                                    : block
                                ),
                              },
                              label
                            )
                          }
                        />
                        {(selectedBlock.data as { image?: { mediaAssetId?: string } })
                          .image?.mediaAssetId ? (
                          <ReusableDesignBrowser
                            kind="EMAIL_SECTION"
                            value={selectedBlock.data as CreativeFlowSection}
                            title="Saved Email sections"
                            onInsert={(next) =>
                              patchDocument(
                                {
                                  blocks: (document.blocks ?? []).map((block) =>
                                    block.id === selectedBlock.id
                                      ? {
                                          ...block,
                                          data: next as unknown as Record<string, unknown>,
                                        }
                                      : block
                                  ),
                                },
                                "Inserted reusable Email section"
                              )
                            }
                          />
                        ) : null}
                      </div>
                    )}
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
                        valueAssetId={
                          (selectedBlock.data as { mediaAssetId?: string }).mediaAssetId
                        }
                        onAssetChange={(asset) => {
                          patchDocument(
                            {
                              blocks: (document.blocks ?? []).map((block) =>
                                block.id === selectedBlock.id
                                  ? {
                                      ...block,
                                      data: {
                                        ...block.data,
                                        imageUrl: asset?.url || "",
                                        mediaAssetId: asset?.mediaAssetId,
                                      },
                                    }
                                  : block
                              ),
                            },
                            "Replace image"
                          );
                        }}
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
          <div className="flex h-full min-h-0 flex-col gap-3 p-3" data-testid="email-live-canvas">
            <CampaignReplyHandlingSection
              campaignId={campaign.id}
              replyHandling={document.replyHandling}
              onOverrideChange={(next: CampaignReplyHandlingOverride | null) => {
                patchDocument(
                  {
                    replyHandling: next,
                    ...(next?.directReplyTo
                      ? { replyTo: next.directReplyTo }
                      : {}),
                  },
                  next ? "Campaign reply override" : "Reset reply handling"
                );
              }}
            />
            <p
              className="text-[10px] text-white/45"
              data-testid="email-no-live-send"
              data-adapter={emailReady ? "live" : "mock"}
            >
              {canLiveSend()
                ? null
                : emailReady
                  ? "Live send stays disabled in this wave — prepare and approve here."
                  : "No email provider connected (mock adapter) — approving prepares the email locally; nothing is delivered."}
            </p>
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
