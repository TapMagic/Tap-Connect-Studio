import { prisma } from "@/lib/db";
import {
  leadThankYouHtml,
  ownerLeadNotifyHtml,
  sendTransactionalEmail,
} from "@/lib/services/email";
import { isEmailReady } from "@/lib/config/integrations";
import { parseEmailPromo, renderEmailPromoHtml } from "@/lib/email-promo";
import {
  parseFormSettingsEmail,
  resolveEmailOfferBlocks,
} from "@/lib/campaign-email";
import { parseContentBlocks } from "@/lib/services/devices";
import { sendEmailViaMock } from "@/lib/fusion/comms/email-mock";
import type { EmailLinkContext } from "@/lib/fusion/comms/email-wire";

type LeadEmailLink = EmailLinkContext & {
  correlationId?: string;
};

async function deliverLeadEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  businessId: string;
  link?: LeadEmailLink;
}) {
  const live = isEmailReady();
  if (live) {
    await sendTransactionalEmail({
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return;
  }

  await sendEmailViaMock({
    businessId: input.businessId,
    to: input.to,
    subject: input.subject,
    body: input.text || input.subject,
    purpose: "transactional",
    featureEnabled: true,
    link: input.link,
  });
}

/** Fire-and-forget emails after a lead is captured. Never throws to the caller. */
export async function notifyOnLeadCapture(params: {
  businessId: string;
  leadId: string;
  leadEmail: string;
  leadName?: string | null;
  leadPhone?: string | null;
  campaignId?: string | null;
  deviceSlotId?: string | null;
  message?: string | null;
  type: string;
  contactId?: string;
  relationshipId?: string;
  threadId?: string;
  correlationId?: string;
}) {
  try {
    const business = await prisma.business.findUnique({
      where: { id: params.businessId },
      select: {
        name: true,
        email: true,
        logoUrl: true,
        googleReviewUrl: true,
        brandKit: true,
        users: {
          where: { role: { in: ["OWNER", "MANAGER"] } },
          include: { user: { select: { email: true } } },
        },
      },
    });
    if (!business) return;

    const [campaign, device] = await Promise.all([
      params.campaignId
        ? prisma.campaign.findUnique({
            where: { id: params.campaignId },
            select: { title: true, formSettings: true, contentBlocks: true },
          })
        : null,
      params.deviceSlotId
        ? prisma.deviceSlot.findUnique({
            where: { id: params.deviceSlotId },
            select: { nickname: true, deviceCode: true },
          })
        : null,
    ]);

    const ownerEmails = [
      business.email,
      ...business.users.map((u) => u.user.email),
    ].filter((e): e is string => Boolean(e?.trim()));

    const uniqueOwners = [...new Set(ownerEmails.map((e) => e.trim().toLowerCase()))];
    const deviceLabel = device?.nickname ?? device?.deviceCode ?? null;

    const leadLink: LeadEmailLink | undefined =
      params.contactId && params.relationshipId
        ? {
            threadId: params.threadId,
            leadId: params.leadId,
            contactId: params.contactId,
            relationshipId: params.relationshipId,
            correlationId: params.correlationId,
          }
        : undefined;

    await Promise.all(
      uniqueOwners.map((to) =>
        deliverLeadEmail({
          to,
          subject: `New Tap Connect lead — ${business.name}`,
          html: ownerLeadNotifyHtml({
            businessName: business.name,
            leadName: params.leadName,
            leadEmail: params.leadEmail,
            leadPhone: params.leadPhone,
            campaignTitle: campaign?.title,
            deviceLabel,
            message: params.message,
            type: params.type,
          }),
          text: `New lead: ${params.leadName ?? ""} ${params.leadEmail}`.trim(),
          businessId: params.businessId,
        })
      )
    );

    // Prefer per-campaign email offer (contact → email offer)
    if (campaign) {
      const emailResponse = parseFormSettingsEmail(campaign.formSettings, business.name);
      if (emailResponse.enabled && emailResponse.sendOnCapture !== false) {
        const pageBlocks = parseContentBlocks(campaign.contentBlocks);
        const offerBlocks = resolveEmailOfferBlocks({
          emailResponse,
          pageBlocks,
        });
        const template = {
          ...emailResponse,
          blocks: offerBlocks.length ? offerBlocks : emailResponse.blocks,
        };
        await deliverLeadEmail({
          to: params.leadEmail,
          subject: template.subject || `Your offer from ${business.name}`,
          html: renderEmailPromoHtml({
            template,
            businessName: business.name,
            leadName: params.leadName,
            logoUrl: business.logoUrl,
            primaryColor: business.brandKit?.primaryColor,
          }),
          text: `Thanks for connecting with ${business.name}. Check this email for your offer.`,
          businessId: params.businessId,
          link: leadLink,
        });
        return;
      }
    }

    const promo = parseEmailPromo(business.brandKit?.emailPromo, business.name);
    if (promo.enabled) {
      await deliverLeadEmail({
        to: params.leadEmail,
        subject: promo.subject || `Thanks from ${business.name}`,
        html: renderEmailPromoHtml({
          template: promo,
          businessName: business.name,
          leadName: params.leadName,
          logoUrl: business.logoUrl,
          primaryColor: business.brandKit?.primaryColor,
        }),
        text: `Thanks for connecting with ${business.name}.`,
        businessId: params.businessId,
        link: leadLink,
      });
    } else {
      await deliverLeadEmail({
        to: params.leadEmail,
        subject: `Thanks from ${business.name}`,
        html: leadThankYouHtml({
          businessName: business.name,
          leadName: params.leadName,
          reviewUrl: business.googleReviewUrl,
        }),
        text: `Thanks for connecting with ${business.name}.`,
        businessId: params.businessId,
        link: leadLink,
      });
    }
  } catch (error) {
    console.error("Lead email notify error:", error);
  }
}
