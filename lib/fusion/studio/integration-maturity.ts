/**
 * Integrations maturity hierarchy — honest capability labels.
 * Does not add integrations; reorganizes presentation of existing ones.
 */

import {
  integrations,
  nativeFeatures,
  type IntegrationStatus,
} from "@/lib/config/integrations";

export type IntegrationMaturityGroup =
  | "works_now"
  | "after_setup"
  | "local_or_test"
  | "planned";

export type IntegrationCapabilityCard = {
  id: string;
  name: string;
  group: IntegrationMaturityGroup;
  maturityLabel: string;
  receives: string;
  sends: string;
  direction: "one_way" | "bidirectional" | "none";
  knowsAfterward: string;
  customerSetupRequired: boolean;
  operatorSetupRequired: boolean;
  runtimeState: string;
  configured?: boolean;
  envVars?: string[];
  costNote?: string;
  signupUrl?: string;
};

export const MATURITY_GROUP_META: Record<
  IntegrationMaturityGroup,
  { title: string; description: string; testId: string }
> = {
  works_now: {
    title: "Works now",
    description: "Available in this Studio without an external account.",
    testId: "integrations-group-works-now",
  },
  after_setup: {
    title: "Available after setup",
    description: "Implemented locally — needs customer or operator credentials before production use.",
    testId: "integrations-group-after-setup",
  },
  local_or_test: {
    title: "Local or provider test",
    description: "Durable or wired for local proof — not production-configured.",
    testId: "integrations-group-local-test",
  },
  planned: {
    title: "Planned",
    description: "Listed for honesty — not a working integration path yet.",
    testId: "integrations-group-planned",
  },
};

const NATIVE_CAPABILITY_COPY: Record<
  keyof typeof nativeFeatures,
  Pick<IntegrationCapabilityCard, "receives" | "sends" | "knowsAfterward">
> = {
  qrCodes: {
    receives: "Device / Tap Point codes",
    sends: "QR artwork for print and screen",
    knowsAfterward: "Tap Points can be scanned without a third-party account",
  },
  urlMedia: {
    receives: "Public media URLs",
    sends: "Embedded media in Card / Campaign",
    knowsAfterward: "Host-linked assets render in experiences",
  },
  logoWebSearch: {
    receives: "Brand name or domain search",
    sends: "Logo candidates into Brand Kit / builders",
    knowsAfterward: "Logo options without UploadThing when Wikimedia/favicon path works",
  },
  youtubeEmbed: {
    receives: "YouTube URLs",
    sends: "Embed blocks in campaigns",
    knowsAfterward: "Video playback via YouTube embed",
  },
  campaignEdit: {
    receives: "Host campaign edits",
    sends: "Published campaign pages",
    knowsAfterward: "Campaign content is authoritative in Studio",
  },
  schedulingUi: {
    receives: "Schedule UI inputs",
    sends: "Group / rotation configuration",
    knowsAfterward: "Schedule intent is stored; full rules engine may still be partial",
  },
  templatePreview: {
    receives: "Template selection",
    sends: "Workbench draft campaign",
    knowsAfterward: "Host can preview templates without paid AI",
  },
};

function classifyProvider(i: IntegrationStatus): IntegrationCapabilityCard {
  const base = {
    id: i.id,
    name: i.name,
    configured: i.configured,
    envVars: i.envVars,
    costNote: i.costNote,
    signupUrl: i.signupUrl,
  };

  switch (i.id) {
    case "clerk":
      return {
        ...base,
        group: i.configured ? "works_now" : "after_setup",
        maturityLabel: i.configured ? "Works now" : "Available after setup",
        receives: "Sign-in sessions and org membership",
        sends: "Authenticated Studio access",
        direction: "bidirectional",
        knowsAfterward: "Who is signed in and which business they operate",
        customerSetupRequired: false,
        operatorSetupRequired: true,
        runtimeState: i.configured ? "Auth configured" : "Pending Clerk keys",
      };
    case "resend":
      return {
        ...base,
        group: "local_or_test",
        maturityLabel:
          "Implemented with limits · Prisma durable · Provider not production-configured · Campaign sending disabled",
        receives: "Inbound email replies (webhook) when secrets are set",
        sends: "No live campaign send from Studio in this wave",
        direction: "one_way",
        knowsAfterward:
          "Routed replies, classification, and handoff destinations when Email & Replies is connected",
        customerSetupRequired: true,
        operatorSetupRequired: true,
        runtimeState: i.configured
          ? "Keys present — production DNS/webhook still required for live mail"
          : "Local/test path · campaign sending disabled",
      };
    case "openai":
      return {
        ...base,
        group: i.configured ? "after_setup" : "after_setup",
        maturityLabel: i.configured
          ? "Available after setup · pay-per-use"
          : "Available after setup",
        receives: "Host prompts and Brand context",
        sends: "Copy suggestions and Autopilot assistance when gated on",
        direction: "one_way",
        knowsAfterward: "Generated drafts — host approval still required",
        customerSetupRequired: false,
        operatorSetupRequired: true,
        runtimeState: i.configured ? "API key present" : "Pending OPENAI_API_KEY",
      };
    case "stripe":
      return {
        ...base,
        group: i.configured ? "after_setup" : "planned",
        maturityLabel: i.configured ? "Available after setup" : "Planned · billing path",
        receives: "Checkout and subscription events",
        sends: "Plan entitlement signals",
        direction: "bidirectional",
        knowsAfterward: "Billing state when webhook and keys are live",
        customerSetupRequired: true,
        operatorSetupRequired: true,
        runtimeState: i.configured ? "Keys present" : "Not configured",
      };
    case "getresponse":
      return {
        ...base,
        group: "planned",
        maturityLabel: "Planned · future CRM add-on",
        receives: "Marketing list sync (future)",
        sends: "Campaign audiences (future)",
        direction: "bidirectional",
        knowsAfterward: "Nothing yet — not a working path",
        customerSetupRequired: true,
        operatorSetupRequired: true,
        runtimeState: "Planned",
      };
    case "uploadthing":
    case "r2":
    case "unsplash":
    case "pexels":
    case "logo_dev":
      return {
        ...base,
        group: i.configured ? "works_now" : "after_setup",
        maturityLabel: i.configured ? "Works now" : "Available after setup",
        receives: "Media search or upload requests",
        sends: "Assets into Brand Kit / builders",
        direction: "one_way",
        knowsAfterward: "Stored or referenced media URLs for experiences",
        customerSetupRequired: false,
        operatorSetupRequired: true,
        runtimeState: i.configured ? "Configured" : `Pending ${i.envVars[0]}`,
      };
    default:
      return {
        ...base,
        group: i.configured ? "after_setup" : "planned",
        maturityLabel: i.configured ? "Available after setup" : "Planned",
        receives: i.description,
        sends: "See description",
        direction: "one_way",
        knowsAfterward: i.configured ? "Provider responses when called" : "Nothing until configured",
        customerSetupRequired: false,
        operatorSetupRequired: true,
        runtimeState: i.configured ? "Configured" : "Pending",
      };
  }
}

export function buildNativeCapabilityCards(): IntegrationCapabilityCard[] {
  return (Object.keys(nativeFeatures) as Array<keyof typeof nativeFeatures>).map((key) => {
    const copy = NATIVE_CAPABILITY_COPY[key];
    return {
      id: `native_${key}`,
      name: key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim(),
      group: "works_now" as const,
      maturityLabel: "Works now · no external account required",
      receives: copy.receives,
      sends: copy.sends,
      direction: "none" as const,
      knowsAfterward: copy.knowsAfterward,
      customerSetupRequired: false,
      operatorSetupRequired: false,
      runtimeState: "Native",
    };
  });
}

/** Monday / Zapier-style productivity honesty (exact capability, not logo implication). */
export function buildProductivityHonestyCards(): IntegrationCapabilityCard[] {
  return [
    {
      id: "productivity_monday",
      name: "Monday.com",
      group: "local_or_test",
      maturityLabel: "Local or provider test · mock connect + live credential gate",
      receives: "Work item create/update intents from Productivity panel",
      sends: "Board item payloads when credentials verify",
      direction: "one_way",
      knowsAfterward: "Mock or verified handoff status — not full two-way sync",
      customerSetupRequired: true,
      operatorSetupRequired: true,
      runtimeState: "Adapter present · live calls need credentials",
    },
    {
      id: "productivity_zapier",
      name: "Zapier",
      group: "local_or_test",
      maturityLabel: "Local or provider test · webhook-style handoff",
      receives: "Studio events selected in Productivity panel",
      sends: "Outbound webhook payloads when configured",
      direction: "one_way",
      knowsAfterward: "Delivery attempt status — Zapier owns downstream automation",
      customerSetupRequired: true,
      operatorSetupRequired: true,
      runtimeState: "Capability shown honestly · not logo-level implication of full sync",
    },
  ];
}

export function buildEmailRepliesCapabilityCard(input?: {
  prismaDurable?: boolean;
  providerConfigured?: boolean;
}): IntegrationCapabilityCard {
  const providerConfigured = input?.providerConfigured ?? false;
  return {
    id: "email_replies",
    name: "Email & Replies",
    group: "local_or_test",
    maturityLabel:
      "Implemented with limits · Prisma durable · Provider not production-configured · Campaign sending disabled",
    receives: "Inbound replies to campaign reply aliases",
    sends: "Routed handoffs to connected destinations (no live campaign send)",
    direction: "one_way",
    knowsAfterward: "Classification, routing evidence, and operator readiness",
    customerSetupRequired: true,
    operatorSetupRequired: true,
    runtimeState: providerConfigured
      ? "Keys present — production DNS/webhook still required"
      : "Prisma durable locally · sending disabled",
    configured: providerConfigured,
  };
}

export function buildIntegrationMaturityCatalog(opts?: {
  resendConfigured?: boolean;
}): {
  group: IntegrationMaturityGroup;
  cards: IntegrationCapabilityCard[];
}[] {
  const resendConfigured =
    opts?.resendConfigured ??
    integrations.find((i) => i.id === "resend")?.configured ??
    false;

  const cards: IntegrationCapabilityCard[] = [
    ...buildNativeCapabilityCards(),
    buildEmailRepliesCapabilityCard({ providerConfigured: resendConfigured }),
    ...buildProductivityHonestyCards(),
    ...integrations.filter((i) => i.id !== "resend").map(classifyProvider),
  ];

  const order: IntegrationMaturityGroup[] = [
    "works_now",
    "after_setup",
    "local_or_test",
    "planned",
  ];

  return order.map((group) => ({
    group,
    cards: cards.filter((c) => c.group === group),
  }));
}
