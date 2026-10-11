/**
 * One production entry point for editable Card and Experience work.
 *
 * `/dashboard/card` is the non-authoring assembly/readiness surface. Anything
 * presented to an operator as Open Card, Edit Card, or Card Builder must use
 * this route so it cannot silently select a different cockpit.
 */
export const CARD_STUDIO_AUTHORING_PATH = "/dashboard/card/edit";
