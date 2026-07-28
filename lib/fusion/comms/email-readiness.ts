/**
 * Email provider readiness — honest credential blockers for Admin.
 */

export type EmailProviderReadiness = {
  provider: "resend";
  ready: boolean;
  mockAvailable: boolean;
  missingEnvVars: string[];
  fromConfigured: boolean;
};

const REQUIRED = ["RESEND_API_KEY", "RESEND_FROM_EMAIL"] as const;

export function listEmailProviderReadiness(): EmailProviderReadiness {
  const missingEnvVars = REQUIRED.filter((k) => !process.env[k]?.trim());
  return {
    provider: "resend",
    ready: missingEnvVars.length === 0,
    mockAvailable: true,
    missingEnvVars: [...missingEnvVars],
    fromConfigured: Boolean(process.env.RESEND_FROM_EMAIL?.trim()),
  };
}

/**
 * Plain-language, display-only summary of the email send path.
 * No behavior change — purely for honest UI copy (no-send contract).
 */
export type EmailSendDisplay = {
  /** True only when Resend is fully configured for a real send */
  liveConfigured: boolean;
  /** "mock" when running on the mock adapter, "live" when Resend is configured */
  adapter: "mock" | "live";
  /** One-line, customer-simple statement of what happens on send */
  headline: string;
  /** Why send is unavailable / what a live send would require */
  detail: string;
  /** Env vars still needed to go live (empty when live) */
  missingEnvVars: string[];
};

export function describeEmailSendPath(): EmailSendDisplay {
  const readiness = listEmailProviderReadiness();
  if (readiness.ready) {
    return {
      liveConfigured: true,
      adapter: "live",
      headline: "Resend is connected.",
      detail:
        "A verified email provider is configured. Live sending stays off in this wave — prepare and approve here first.",
      missingEnvVars: [],
    };
  }
  return {
    liveConfigured: false,
    adapter: "mock",
    headline: "No email provider is connected — nothing will be sent.",
    detail:
      "This workspace is running on the mock adapter (Resend is not configured), so approving an email prepares it locally but never delivers a real message. Connect Resend in Settings to enable live sending later.",
    missingEnvVars: [...readiness.missingEnvVars],
  };
}

export function summarizeCommsReadiness(featureEmailEnabled: boolean, featureMessagingEnabled: boolean) {
  const email = listEmailProviderReadiness();
  return {
    email: {
      featureEnabled: featureEmailEnabled,
      ...email,
      mode: email.ready ? ("live" as const) : ("mock" as const),
    },
    messaging: {
      featureEnabled: featureMessagingEnabled,
      note: "Channel Guardian gates all outbound messaging",
    },
  };
}
