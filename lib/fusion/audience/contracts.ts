/**
 * Audience domain contracts — Contact, Relationship, Consent, MyTap projection.
 */

export type ConsentChannel = "EMAIL" | "SMS" | "WALLET" | "MARKETING";
export type ConsentStatus = "GRANTED" | "DENIED" | "WITHDRAWN";
export type RelationshipStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";

export type ContactRecord = {
  id: string;
  businessId: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerRelationshipRecord = {
  id: string;
  businessId: string;
  contactId: string;
  publicToken: string;
  status: RelationshipStatus;
  tapSaveEnabled: boolean;
  sourceType: string | null;
  createdAt: string;
};

export type ConsentRecordDto = {
  id: string;
  contactId: string;
  channel: ConsentChannel;
  status: ConsentStatus;
  legalBasis: string | null;
  sourceType: string | null;
  recordedAt: string;
};

export type LeadCaptureAudienceInput = {
  businessId: string;
  leadId: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  consentGiven: boolean;
  campaignId?: string | null;
  deviceSlotId?: string | null;
  captureType?: string;
};

export type LeadCaptureAudienceResult = {
  contactId: string;
  relationshipId: string;
  publicToken: string;
  consentRecorded: boolean;
};

/** Privacy-safe public MyTap view — no email/phone/name */
export type MyTapProjection = {
  relationshipToken: string;
  businessName: string;
  businessLogoUrl: string | null;
  status: "active" | "paused" | "unavailable";
  tapSaveEnabled: boolean;
  savedAt: string | null;
  channels: {
    email: boolean;
    wallet: boolean;
    marketing: boolean;
  };
  message: string;
};
