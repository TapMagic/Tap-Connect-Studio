export type ControlEnvironment = "production" | "staging" | "local";

export function controlEnvironment(): ControlEnvironment {
  const explicit = process.env.TAPCONNECT_ENVIRONMENT?.toLowerCase();
  if (explicit === "production" || explicit === "staging" || explicit === "local") {
    return explicit;
  }
  return process.env.NODE_ENV === "production" ? "production" : "local";
}

export function environmentLabel(environment = controlEnvironment()): string {
  if (environment === "production") return "PRODUCTION — LIVE CUSTOMER DATA";
  if (environment === "staging") return "STAGING — NON-CUSTOMER TEST DATA";
  return "LOCAL — FIXTURE DATA ONLY";
}

export function isProductionEnvironment(): boolean {
  return controlEnvironment() === "production";
}

