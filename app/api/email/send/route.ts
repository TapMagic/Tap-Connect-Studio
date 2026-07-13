import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { sendEmailPlaceholder } from "@/lib/integrations/placeholders";
import { sendTransactionalEmail } from "@/lib/services/email";

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(2).max(160),
  html: z.string().min(2).max(20000),
  previewText: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    const placeholder = await sendEmailPlaceholder();
    if (placeholder) {
      return NextResponse.json(placeholder, { status: 503 });
    }

    await requireBusiness();
    const body = schema.parse(await request.json());
    const result = await sendTransactionalEmail({
      to: body.to,
      subject: body.subject,
      html: body.html,
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
