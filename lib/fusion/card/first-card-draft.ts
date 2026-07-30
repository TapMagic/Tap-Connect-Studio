import type { CustomerOutcome, FontStyle } from "@prisma/client";
import type {
  TapCardActionKind,
  TapCardSection,
  TapConnectCardConfig,
} from "@/lib/brand/tap-card";

export type ApprovedCardFact = {
  id: string;
  factKey: string;
  value: unknown;
};

export type FirstCardBrand = {
  logoUrl?: string | null;
  primaryColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  fontStyle?: FontStyle | null;
  decisionIds?: string[];
};

export type FirstCardManifest = {
  usedFactIds: string[];
  usedBrandDecisionIds: string[];
  omissions: string[];
  questions: string[];
  generatorOwnedSectionIds: string[];
};

export type FirstCardDraftResult = {
  draft: TapConnectCardConfig;
  manifest: FirstCardManifest;
};

function textFact(facts: ApprovedCardFact[], key: string): ApprovedCardFact | undefined {
  const fact = facts.find((candidate) => candidate.factKey === key);
  return fact && typeof fact.value === "string" && fact.value.trim()
    ? { ...fact, value: fact.value.trim() }
    : undefined;
}

function action(
  id: string,
  order: number,
  kind: TapCardActionKind,
  label: string,
  href?: string
): TapCardSection {
  return {
    id,
    type: "action",
    enabled: true,
    order,
    actionKind: kind,
    label,
    href,
    icon: kind,
    finish: "soft",
    shape: "rounded_lg",
  };
}

function questionsForOutcome(
  outcome: CustomerOutcome,
  available: Set<string>
): string[] {
  const missing = (key: string) => !available.has(key);
  switch (outcome) {
    case "CONTACT":
      return missing("phone") && missing("email") && missing("website")
        ? ["What is the best confirmed way for customers to contact you?"]
        : [];
    case "REVIEWS":
      return missing("reviewUrl")
        ? ["What is the exact link customers should use to leave a review?"]
        : [];
    case "OFFER":
      return ["offerTitle", "offerDescription", "offerUrl"].some(missing)
        ? ["What are the exact offer details and destination you want customers to see?"]
        : [];
    case "APPOINTMENTS":
      return missing("bookingUrl") && missing("phone")
        ? ["What confirmed booking link or phone number should customers use?"]
        : [];
    case "DIRECTIONS":
      return missing("address") && missing("mapUrl")
        ? ["What full address or map link should customers use for directions?"]
        : [];
    case "FAQ":
      return missing("faq")
        ? ["Which customer question and exact approved answer should this Card include first?"]
        : [];
    case "LOYALTY":
      return ["Is there an existing approved loyalty program this Card may link to?"];
    case "ESSENTIALS":
      return missing("website") && missing("phone") && missing("email")
        ? ["Which confirmed contact detail would make this Card most useful?"]
        : [];
  }
}

export function buildFirstCardDraft(input: {
  businessName: string;
  outcome: CustomerOutcome;
  facts: ApprovedCardFact[];
  brand?: FirstCardBrand;
}): FirstCardDraftResult {
  const businessName = input.businessName.trim();
  if (!businessName) throw new Error("businessName is required");

  const used = new Set<string>();
  const sections: TapCardSection[] = [];
  const available = new Set(input.facts.map((fact) => fact.factKey));
  const get = (key: string) => {
    const fact = textFact(input.facts, key);
    if (fact) used.add(fact.id);
    return fact?.value as string | undefined;
  };

  const website = get("website");
  const phone = get("phone");
  const email = get("email");
  const address = get("address");
  const mapUrl = get("mapUrl");
  const reviewUrl = get("reviewUrl");
  const bookingUrl = get("bookingUrl");
  const description = get("description");
  const offerTitle = get("offerTitle");
  const offerDescription = get("offerDescription");
  const offerUrl = get("offerUrl");
  const faq = get("faq");

  sections.push({
    id: "onboarding-identity",
    type: "identity",
    enabled: true,
    order: 0,
    name: businessName,
    organization: businessName,
    headline: description || `Connect with ${businessName}`,
    label: "Business identity",
    format: {
      fontFamily: input.brand?.fontStyle === "CLASSIC" ? "serif" : "sans",
      fontWeight: "bold",
      align: "center",
      fontSize: "xl",
    },
  });

  let order = 1;
  if (input.brand?.logoUrl) {
    sections.unshift({
      id: "onboarding-logo",
      type: "logo_block",
      enabled: true,
      order: 0,
      logoUrl: input.brand.logoUrl,
      altText: `${businessName} logo`,
      label: "Approved logo",
    });
    sections[1].order = 1;
    order = 2;
  }

  if (input.outcome === "REVIEWS" && reviewUrl) {
    sections.push(action("onboarding-review", order++, "review", "Leave a review", reviewUrl));
  }
  if (input.outcome === "APPOINTMENTS" && (bookingUrl || phone)) {
    sections.push(
      action(
        "onboarding-book",
        order++,
        bookingUrl ? "book" : "call",
        bookingUrl ? "Book an appointment" : `Call ${businessName}`,
        bookingUrl || (phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : undefined)
      )
    );
  }
  if (input.outcome === "DIRECTIONS" && (mapUrl || address)) {
    sections.push(
      action(
        "onboarding-directions",
        order++,
        "map",
        "Get directions",
        mapUrl || `https://maps.google.com/?q=${encodeURIComponent(address || "")}`
      )
    );
  }
  if (input.outcome === "OFFER" && offerTitle && offerDescription && offerUrl) {
    sections.push({
      id: "onboarding-offer",
      type: "special_offer",
      enabled: true,
      order: order++,
      label: offerTitle,
      offerTitle,
      offerDescription,
      offerCta: "View offer",
      href: offerUrl,
      offerMode: "link",
      specialStyle: "card",
    });
  }
  if (input.outcome === "FAQ" && faq) {
    sections.push({
      id: "onboarding-faq",
      type: "text",
      enabled: true,
      order: order++,
      label: "Common question",
      text: faq,
    });
  }

  if (website) {
    sections.push(action("onboarding-website", order++, "website", "Visit website", website));
  }
  if (phone && !sections.some((section) => section.actionKind === "call")) {
    sections.push(
      action(
        "onboarding-phone",
        order++,
        "call",
        `Call ${businessName}`,
        `tel:${phone.replace(/[^\d+]/g, "")}`
      )
    );
  }
  if (email) {
    sections.push(
      action("onboarding-email", order++, "email", `Email ${businessName}`, `mailto:${email}`)
    );
  }

  const omissions: string[] = [];
  if (!website) omissions.push("Website omitted: no approved website.");
  if (!phone) omissions.push("Phone omitted: no approved phone number.");
  if (!email) omissions.push("Email omitted: no approved email address.");
  if (!address && !mapUrl) omissions.push("Directions omitted: no approved address or map link.");
  if (!reviewUrl) omissions.push("Review action omitted: no approved review link.");

  const draft: TapConnectCardConfig = {
    version: 3,
    accentColor: input.brand?.primaryColor || "#b7ff2a",
    surfaceColor: input.brand?.backgroundColor || "#0b0f12",
    textColor: input.brand?.textColor || "#ffffff",
    neonColor: input.brand?.primaryColor || "#b7ff2a",
    headerEnergy: 45,
    collapsible: false,
    defaultCollapsed: false,
    actionsLayout: "stack",
    defaultFinish: "soft",
    cardFinish: "soft",
    defaultShape: "rounded_lg",
    view3d: false,
    showHeaderLogo: Boolean(input.brand?.logoUrl),
    headerLogoUrl: input.brand?.logoUrl || undefined,
    headerLogoScale: 100,
    surfaceOpacity: 100,
    surfaceFill: "solid",
    compactActionsOnly: false,
    sections,
    utilityLayer: {
      enabled: true,
      presentation: "compact_row",
      utilities: [
        { kind: "keep", enabled: true, label: "Keep this Card" },
        { kind: "vcard", enabled: Boolean(phone || email), label: "Save Contact" },
        { kind: "map", enabled: Boolean(address || mapUrl), label: "Directions" },
        { kind: "book", enabled: Boolean(bookingUrl), label: "Book" },
        { kind: "support", enabled: false },
        { kind: "shop", enabled: false },
      ],
    },
  };

  return {
    draft,
    manifest: {
      usedFactIds: [...used],
      usedBrandDecisionIds: input.brand?.decisionIds || [],
      omissions,
      questions: questionsForOutcome(input.outcome, available).slice(0, 1),
      generatorOwnedSectionIds: sections.map((section) => section.id),
    },
  };
}
