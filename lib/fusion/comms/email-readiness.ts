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
