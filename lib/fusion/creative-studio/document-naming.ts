export const CREATIVE_DOCUMENT_NAME_MAX = 120;

export type CreativeDocumentType =
  | "CARD"
  | "CAMPAIGN"
  | "CAMPAIGN_GROUP_CREATIVE"
  | "REUSABLE_COMPOSITION"
  | "OFFER"
  | "TICKET"
  | "EMAIL_COMPOSITION"
  | "EXPERIENCE";

export type CreativeDocumentIdentity = {
  id: string;
  type: CreativeDocumentType;
  name: string;
};

export function normalizeCreativeDocumentName(value: string): string {
  return Array.from(value.trim().replace(/\s+/gu, " "))
    .slice(0, CREATIVE_DOCUMENT_NAME_MAX)
    .join("");
}

export function requireCreativeDocumentName(value: string): string {
  const normalized = normalizeCreativeDocumentName(value);
  if (!normalized) throw new Error("Document name is required");
  return normalized;
}

export function cloneCreativeDocumentName(value: string): string {
  return normalizeCreativeDocumentName(`Copy of ${requireCreativeDocumentName(value)}`);
}

export function renameCreativeDocument<T extends CreativeDocumentIdentity>(
  document: T,
  name: string
): T {
  return { ...document, name: requireCreativeDocumentName(name) };
}
