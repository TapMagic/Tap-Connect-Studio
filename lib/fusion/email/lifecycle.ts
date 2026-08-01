import { Prisma, type EmailStatus, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  parseFormSettingsEmailDocument,
  serializeEmailDocument,
  type EmailDocument as EmailContent,
} from "@/lib/fusion/email/document";

type EmailClient = Pick<PrismaClient, "campaign" | "emailDocument" | "emailLifecycleEvent">;

const TRANSITIONS: Record<EmailStatus, readonly EmailStatus[]> = {
  DRAFT: ["READY", "ARCHIVED"],
  READY: ["DRAFT", "SCHEDULED", "BLOCKED", "ARCHIVED"],
  SCHEDULED: ["QUEUED", "BLOCKED", "FAILED", "CANCELLED", "ARCHIVED"],
  QUEUED: ["SENDING", "BLOCKED", "FAILED", "CANCELLED"],
  SENDING: ["SENT", "PARTIALLY_DELIVERED", "FAILED"],
  SENT: ["DELIVERED", "PARTIALLY_DELIVERED", "FAILED", "ARCHIVED"],
  PARTIALLY_DELIVERED: ["DELIVERED", "FAILED", "ARCHIVED"],
  DELIVERED: ["ARCHIVED"],
  BLOCKED: ["DRAFT", "ARCHIVED"],
  FAILED: ["DRAFT", "ARCHIVED"],
  CANCELLED: ["DRAFT", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export function canTransitionEmail(from: EmailStatus, to: EmailStatus) {
  return from === to || TRANSITIONS[from].includes(to);
}

export class EmailLifecycleError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "revision_conflict" | "invalid_transition" | "invalid_document" | "invalid_schedule",
    readonly status: number,
  ) {
    super(message);
    this.name = "EmailLifecycleError";
  }
}

function formSettingsWithEmail(formSettings: unknown, document: EmailContent) {
  const current = formSettings && typeof formSettings === "object" && !Array.isArray(formSettings)
    ? (formSettings as Record<string, unknown>)
    : {};
  return { ...current, emailResponse: document };
}

function documentIsReady(document: EmailContent) {
  return Boolean(document.subject?.trim() && document.blocks?.length);
}

export async function ensureCampaignEmailDocument(input: {
  businessId: string;
  campaignId: string;
  businessName: string;
  actorId?: string | null;
  client?: EmailClient;
}) {
  const client = input.client ?? prisma;
  const existing = await client.emailDocument.findUnique({
    where: { businessId_campaignId: { businessId: input.businessId, campaignId: input.campaignId } },
    include: { lifecycleEvents: { orderBy: { occurredAt: "desc" }, take: 30 } },
  });
  if (existing) return existing;
  const campaign = await client.campaign.findFirst({
    where: { id: input.campaignId, businessId: input.businessId },
  });
  if (!campaign) throw new EmailLifecycleError("Campaign not found.", "not_found", 404);
  const document = serializeEmailDocument(
    parseFormSettingsEmailDocument(campaign.formSettings, input.businessName),
  );
  const created = await client.emailDocument.create({
    data: {
      businessId: input.businessId,
      campaignId: campaign.id,
      name: `${campaign.title} Email`,
      subject: document.subject ?? "",
      document: document as unknown as Prisma.InputJsonValue,
      status: "DRAFT",
      fixtureOnly: true,
      createdById: input.actorId,
      updatedById: input.actorId,
      lifecycleEvents: {
        create: {
          businessId: input.businessId,
          toStatus: "DRAFT",
          command: "create_from_campaign_compatibility",
          actorId: input.actorId,
          reason: "Created first-class Email identity from the retained Campaign draft.",
        },
      },
    },
    include: { lifecycleEvents: true },
  });
  return created;
}

export async function saveEmailDocument(input: {
  businessId: string;
  emailId: string;
  expectedRevision: number;
  document: unknown;
  actorId?: string | null;
  client?: EmailClient;
}) {
  const parsed = serializeEmailDocument(input.document as EmailContent);
  if (!parsed.subject || !Array.isArray(parsed.blocks)) {
    throw new EmailLifecycleError("The Email draft is invalid.", "invalid_document", 400);
  }
  const client = input.client ?? prisma;
  const execute = async (tx: EmailClient) => {
    const current = await tx.emailDocument.findFirst({
      where: { id: input.emailId, businessId: input.businessId },
    });
    if (!current) throw new EmailLifecycleError("Email not found.", "not_found", 404);
    const updated = await tx.emailDocument.updateMany({
      where: { id: current.id, businessId: input.businessId, draftRevision: input.expectedRevision },
      data: {
        subject: parsed.subject,
        document: parsed as unknown as Prisma.InputJsonValue,
        draftRevision: { increment: 1 },
        updatedById: input.actorId,
        ...(current.status === "READY" ? { status: "DRAFT" as const } : {}),
      },
    });
    if (updated.count !== 1) {
      throw new EmailLifecycleError("This Email changed in another session. Reload before saving.", "revision_conflict", 409);
    }
    if (current.campaignId) {
      const campaign = await tx.campaign.findFirst({
        where: { id: current.campaignId, businessId: input.businessId },
      });
      if (campaign) {
        await tx.campaign.update({
          where: { id: campaign.id },
          data: { formSettings: formSettingsWithEmail(campaign.formSettings, parsed) as unknown as Prisma.InputJsonValue },
        });
      }
    }
    return tx.emailDocument.findUniqueOrThrow({ where: { id: current.id } });
  };
  if (input.client) return execute(client);
  return prisma.$transaction((tx) => execute(tx));
}

async function setEmailStatus(
  tx: EmailClient,
  input: {
    businessId: string;
    emailId: string;
    toStatus: EmailStatus;
    command: string;
    actorId?: string | null;
    reason?: string | null;
    scheduledFor?: Date | null;
    metadata?: Prisma.InputJsonValue;
  },
) {
  const current = await tx.emailDocument.findFirst({ where: { id: input.emailId, businessId: input.businessId } });
  if (!current) throw new EmailLifecycleError("Email not found.", "not_found", 404);
  if (!canTransitionEmail(current.status, input.toStatus)) {
    throw new EmailLifecycleError(
      `${current.status} Emails cannot move directly to ${input.toStatus}.`,
      "invalid_transition",
      409,
    );
  }
  const email = await tx.emailDocument.update({
    where: { id: current.id },
    data: {
      status: input.toStatus,
      ...(input.scheduledFor !== undefined ? { scheduledFor: input.scheduledFor } : {}),
      updatedById: input.actorId,
    },
  });
  if (current.status !== input.toStatus) {
    await tx.emailLifecycleEvent.create({
      data: {
        businessId: input.businessId,
        emailId: current.id,
        fromStatus: current.status,
        toStatus: input.toStatus,
        command: input.command,
        actorId: input.actorId,
        reason: input.reason,
        metadata: input.metadata ?? {},
      },
    });
  }
  return email;
}

export async function scheduleFixtureEmail(input: {
  businessId: string;
  emailId: string;
  scheduledFor: Date;
  actorId?: string | null;
}) {
  if (input.scheduledFor <= new Date()) {
    throw new EmailLifecycleError("Choose a future fixture schedule.", "invalid_schedule", 400);
  }
  return prisma.$transaction(async (tx) => {
    let email = await tx.emailDocument.findFirst({ where: { id: input.emailId, businessId: input.businessId } });
    if (!email) throw new EmailLifecycleError("Email not found.", "not_found", 404);
    const document = email.document as unknown as EmailContent;
    if (!documentIsReady(document)) {
      throw new EmailLifecycleError("Add a subject and Email content before scheduling.", "invalid_document", 409);
    }
    if (email.status === "DRAFT") {
      email = await setEmailStatus(tx, {
        businessId: input.businessId,
        emailId: email.id,
        toStatus: "READY",
        command: "validate_fixture",
        actorId: input.actorId,
        reason: "Saved Email passed fixture-safe document validation.",
      });
    }
    return setEmailStatus(tx, {
      businessId: input.businessId,
      emailId: email.id,
      toStatus: "SCHEDULED",
      command: "schedule_fixture",
      actorId: input.actorId,
      scheduledFor: input.scheduledFor,
      reason: "Scheduled for a fixture-safe lifecycle; no recipient contact is authorized.",
      metadata: { realSendAuthorized: false, recipientContext: "fixture" },
    });
  });
}

export async function executeBlockedFixtureEmail(input: {
  businessId: string;
  emailId: string;
  actorId?: string | null;
  blockReason: string;
}) {
  return prisma.$transaction((tx) =>
    setEmailStatus(tx, {
      businessId: input.businessId,
      emailId: input.emailId,
      toStatus: "BLOCKED",
      command: "execute_fixture_blocked",
      actorId: input.actorId,
      reason: input.blockReason,
      metadata: { providerContacted: false, recipientContacted: false },
    }),
  );
}

export async function listEmails(businessId: string) {
  return prisma.emailDocument.findMany({
    where: { businessId },
    include: { campaign: { select: { id: true, title: true } }, lifecycleEvents: { orderBy: { occurredAt: "desc" }, take: 5 } },
    orderBy: { updatedAt: "desc" },
  });
}
