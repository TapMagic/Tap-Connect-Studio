import { Resend } from "resend";
import { isEmailReady } from "@/lib/config/integrations";

export function getEmailFromAddress(): string | null {
  return process.env.RESEND_FROM_EMAIL?.trim() || null;
}

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  if (!isEmailReady()) {
    return { ok: false, error: "Email not configured" };
  }
  const from = getEmailFromAddress();
  if (!from) {
    return { ok: false, error: "RESEND_FROM_EMAIL missing" };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Send failed",
    };
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function ownerLeadNotifyHtml(params: {
  businessName: string;
  leadName?: string | null;
  leadEmail: string;
  leadPhone?: string | null;
  campaignTitle?: string | null;
  deviceLabel?: string | null;
  message?: string | null;
  type: string;
}) {
  const who = params.leadName
    ? `${escapeHtml(params.leadName)} (${escapeHtml(params.leadEmail)})`
    : escapeHtml(params.leadEmail);

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0b0f19;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#121826;border-radius:16px;border:1px solid #1f2937;padding:28px;">
        <tr><td>
          <p style="margin:0;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#a3e635;">Tap Connect</p>
          <h1 style="margin:12px 0 8px;font-size:22px;color:#fff;">New ${params.type === "feedback" ? "feedback" : "lead"}</h1>
          <p style="margin:0 0 20px;color:#94a3b8;font-size:14px;">Someone just engaged with ${escapeHtml(params.businessName)}.</p>
          <table width="100%" style="font-size:14px;color:#e2e8f0;">
            <tr><td style="padding:6px 0;color:#94a3b8;">Contact</td><td style="padding:6px 0;">${who}</td></tr>
            ${params.leadPhone ? `<tr><td style="padding:6px 0;color:#94a3b8;">Phone</td><td style="padding:6px 0;">${escapeHtml(params.leadPhone)}</td></tr>` : ""}
            ${params.campaignTitle ? `<tr><td style="padding:6px 0;color:#94a3b8;">Campaign</td><td style="padding:6px 0;">${escapeHtml(params.campaignTitle)}</td></tr>` : ""}
            ${params.deviceLabel ? `<tr><td style="padding:6px 0;color:#94a3b8;">Device</td><td style="padding:6px 0;">${escapeHtml(params.deviceLabel)}</td></tr>` : ""}
            ${params.message ? `<tr><td style="padding:6px 0;color:#94a3b8;vertical-align:top;">Message</td><td style="padding:6px 0;">${escapeHtml(params.message)}</td></tr>` : ""}
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#64748b;">Powered by Tap The Magic</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function leadThankYouHtml(params: {
  businessName: string;
  leadName?: string | null;
  reviewUrl?: string | null;
}) {
  const greeting = params.leadName
    ? `Thanks, ${escapeHtml(params.leadName)}`
    : "Thanks for connecting";

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0b0f19;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#121826;border-radius:16px;border:1px solid #1f2937;padding:28px;">
        <tr><td>
          <p style="margin:0;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#a3e635;">${escapeHtml(params.businessName)}</p>
          <h1 style="margin:12px 0 8px;font-size:22px;color:#fff;">${greeting}</h1>
          <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.5;">
            We got your info and appreciate you taking a moment with us. We&apos;ll be in touch if there&apos;s something to follow up on.
          </p>
          ${
            params.reviewUrl
              ? `<a href="${escapeHtml(params.reviewUrl)}" style="display:inline-block;background:#a3e635;color:#0b0f19;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:10px;font-size:14px;">Leave a quick review</a>`
              : ""
          }
          <p style="margin:28px 0 0;font-size:12px;color:#64748b;">Powered by Tap The Magic</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
