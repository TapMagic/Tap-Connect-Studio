import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { sendEmailPlaceholder } from "@/lib/integrations/placeholders";
import { sendTransactionalEmail } from "@/lib/services/email";
import { prisma } from "@/lib/db";
import { parseEmailPromo, renderEmailPromoHtml } from "@/lib/email-promo";

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(2).max(160).optional(),
  html: z.string().min(2).max(20000).optional(),
  previewText: z.string().max(200).optional(),
  usePromoTemplate: z.boolean().optional(),
  campaignId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const placeholder = await sendEmailPlaceholder();
    if (placeholder) {
      return NextResponse.json(placeholder, { status: 503 });
    }

    const { business } = await requireBusiness();
    const body = schema.parse(await request.json());

    let subject = body.subject ?? `Thanks from ${business.name}`;
    let html = body.html ?? "";

    if (body.usePromoTemplate || !html) {
      const brandKit = await prisma.brandKit.findUnique({ where: { businessId: business.id } });
      const template = parseEmailPromo(brandKit?.emailPromo, business.name);
      subject = template.subject || subject;
      html = renderEmailPromoHtml({
        template,
        businessName: business.name,
        leadName: "there",
        logoUrl: business.logoUrl,
        primaryColor: brandKit?.primaryColor,
      });
    }

    const result = await sendTransactionalEmail({
      to: body.to,
      subject,
      html,
      text: body.previewText,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, sent: true, id: result.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email data" }, { status: 400 });
    }
    console.error("Send email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
