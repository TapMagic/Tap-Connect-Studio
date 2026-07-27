/**
 * Email & Replies / Reply Routing foundation.
 * Maturity: IMPLEMENTED BUT NOT OWNER-READY
 */

export * from "./types";
export * from "./capabilities";
export * from "./destination";
export * from "./policy";
export * from "./card-state";
export * from "./verification";
export * from "./reply-alias";
export * from "./normalize";
export * from "./classify";
export * from "./loop-protection";
export * from "./routing";
export * from "./handoff";
export * from "./evidence";
export * from "./retention";
export * from "./connected-destinations";
export * from "./operator-readiness";
export * from "./store";
export * from "./store-memory";
export * from "./store-prisma";
export * from "./store-resolve";
export * from "./tapinbox-retain";
export * from "./service";
export * from "./pipeline";
export {
  getReceivingSubdomainSafe,
  buildReplyAliasAddress as buildConfiguredReplyAliasAddress,
} from "./setup-helpers";
export * from "./providers/resend-adapter";
