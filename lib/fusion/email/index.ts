/**
 * Email Builder migration — public exports.
 * Maturity: IMPLEMENTED BUT NOT OWNER-READY.
 */

export * from "./document";
export * from "./offer-binding";
export * from "./compatibility";
export * from "./plain-text";
export * from "./audience-readiness";
export * from "./approval";
export * from "./html-render";
// audience-load is server-only — import from @/lib/fusion/email/audience-load directly
