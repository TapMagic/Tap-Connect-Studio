/**
 * Repository contract for Brand Vocabulary persistence.
 */

import type {
  BrandTerm,
  KeywordAnalyticsEntry,
  KeywordAnalyticsEvent,
  KeywordBrandPack,
  KeywordChannel,
  KeywordSuggestion,
  NamedBrandPack,
  SuggestionFamily,
  TriggerBindingInput,
  VocabularyApprovalStatus,
  VocabularyTermKind,
} from "./types";
import type {
  ConflictWarning,
} from "./types";
import type { ActiveTriggerBinding } from "./trigger-collisions";

export type VocabularyTermRecord = {
  id: string;
  businessId: string;
  brandKitId?: string | null;
  kind: VocabularyTermKind;
  value: string;
  normalizedValue: string;
  locale: string;
  scope: string;
  approvalStatus: VocabularyApprovalStatus;
  sourceType: string;
  rationale?: string | null;
  confidence?: number | null;
  locked: boolean;
  active: boolean;
  channels: KeywordChannel[];
  campaignId?: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

export type SuggestionRunRecord = {
  id: string;
  businessId: string;
  channel?: string | null;
  campaignId?: string | null;
  surface?: string | null;
  generated: KeywordSuggestion[];
  selected: KeywordSuggestion[];
  rejected: KeywordSuggestion[];
  modelProvider: string;
  recipeVersion: string;
  evidenceClass: string;
  createdAt: string;
};

export type VocabularyRepository = {
  listTerms(businessId: string, opts?: { activeOnly?: boolean }): Promise<VocabularyTermRecord[]>;
  upsertTerms(
    businessId: string,
    terms: Array<{
      value: string;
      kind: VocabularyTermKind;
      approvalStatus?: VocabularyApprovalStatus;
      locked?: boolean;
      channels?: KeywordChannel[];
      rationale?: string;
      confidence?: number;
      sourceType?: string;
      campaignId?: string;
      brandKitId?: string;
      createdBy?: string;
    }>
  ): Promise<VocabularyTermRecord[]>;
  setApproval(
    businessId: string,
    termId: string,
    status: VocabularyApprovalStatus,
    approvedBy?: string
  ): Promise<VocabularyTermRecord | null>;
  setLocked(businessId: string, termId: string, locked: boolean): Promise<VocabularyTermRecord | null>;
  archiveTerm(businessId: string, termId: string): Promise<VocabularyTermRecord | null>;
  restoreTerm(businessId: string, termId: string): Promise<VocabularyTermRecord | null>;
  loadBrandPackView(businessId: string): Promise<KeywordBrandPack>;
  mirrorBrandPackJson(businessId: string, pack: KeywordBrandPack): Promise<void>;
  listPacks(businessId: string): Promise<NamedBrandPack[]>;
  createPack(
    businessId: string,
    input: {
      slug: string;
      name: string;
      description?: string;
      locale?: string;
      channels?: KeywordChannel[];
      termIds?: string[];
      approved?: boolean;
      createdBy?: string;
    }
  ): Promise<NamedBrandPack>;
  updatePack(
    businessId: string,
    packId: string,
    patch: Partial<{
      name: string;
      description: string;
      locale: string;
      channels: KeywordChannel[];
      termIds: string[];
      approved: boolean;
      archived: boolean;
    }>
  ): Promise<NamedBrandPack | null>;
  deletePack(businessId: string, packId: string): Promise<boolean>;
  recordSuggestionRun(input: {
    businessId: string;
    channel?: KeywordChannel;
    campaignId?: string;
    surface?: string;
    requestContext: unknown;
    generated: KeywordSuggestion[];
    selected?: KeywordSuggestion[];
    rejected?: KeywordSuggestion[];
    appliedDestination?: string;
    actorId?: string;
  }): Promise<SuggestionRunRecord>;
  updateSuggestionRun(
    runId: string,
    patch: Partial<{
      selected: KeywordSuggestion[];
      rejected: KeywordSuggestion[];
      appliedDestination: string;
    }>
  ): Promise<void>;
  recordAnalytics(input: {
    businessId: string;
    event: KeywordAnalyticsEvent;
    count?: number;
    channel?: KeywordChannel;
    campaignId?: string;
    families?: SuggestionFamily[];
    detail?: unknown;
    actorId?: string;
  }): Promise<KeywordAnalyticsEntry>;
  listAnalytics(businessId: string): Promise<KeywordAnalyticsEntry[]>;
  listTriggerBindings(businessId: string, channel?: string): Promise<ActiveTriggerBinding[]>;
  upsertTriggerBinding(
    businessId: string,
    input: TriggerBindingInput
  ): Promise<{ binding: ActiveTriggerBinding; collisions: ConflictWarning[] }>;
};

export type AcceptableTerm = BrandTerm & { vocabularyKind?: VocabularyTermKind };
