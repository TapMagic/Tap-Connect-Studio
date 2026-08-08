/**
 * Exhaustive Owner-simulation coverage ledger.
 *
 * Every discovered control/context case must end as:
 * VERIFIED | BROKEN | BLOCKED | NOT_APPLICABLE | DEFERRED_BY_SCOPE
 *
 * Zero unexplained reachable enabled controls at closeout.
 */

import fs from "node:fs";
import path from "node:path";
import { EVIDENCE_ROOT } from "./physical-harness";
import {
  BADGE_SHAPE_DEFS,
} from "@/lib/fusion/creative-studio/badge-shape";
import {
  EFFECT_RECIPES,
  MATERIAL_CATALOG,
} from "@/lib/fusion/creative-studio/material-engine";
import {
  STARTER_BADGE_COMPOSITIONS,
  STARTER_BADGE_SHAPES,
  STARTER_BUTTON_PRESETS,
  STARTER_COUPON_LAYOUTS,
  STARTER_TEXT_COMBINATIONS,
  STARTER_TICKET_LAYOUTS,
} from "@/lib/fusion/creative-studio/starter-preset-registry";
import { appearanceCategoriesForFamily } from "@/lib/fusion/creative-studio/appearance-ia";
import { INSERT_SURFACES } from "./interaction-manifest";

export type ExhaustiveStatus =
  | "VERIFIED"
  | "BROKEN"
  | "BLOCKED"
  | "NOT_APPLICABLE"
  | "DEFERRED_BY_SCOPE"
  | "PENDING";

export type LedgerCase = {
  id: string;
  class: string;
  label: string;
  status: ExhaustiveStatus;
  context?: string;
  notes?: string[];
  evidence?: string[];
};

const cases = new Map<string, LedgerCase>();

export function upsertLedgerCase(entry: LedgerCase) {
  cases.set(entry.id, entry);
  writeExhaustiveLedger();
}

/** Seed helper — never downgrade a stronger status already recorded. */
export function ensureLedgerCase(entry: LedgerCase) {
  const prior = cases.get(entry.id);
  if (!prior) {
    upsertLedgerCase(entry);
    return;
  }
  const rank: Record<ExhaustiveStatus, number> = {
    PENDING: 0,
    DEFERRED_BY_SCOPE: 1,
    NOT_APPLICABLE: 2,
    BLOCKED: 3,
    BROKEN: 4,
    VERIFIED: 5,
  };
  if ((rank[prior.status] || 0) >= (rank[entry.status] || 0)) return;
  upsertLedgerCase(entry);
}

export function markLedger(
  id: string,
  status: ExhaustiveStatus,
  patch: Partial<LedgerCase> = {}
) {
  const prior = cases.get(id);
  upsertLedgerCase({
    id,
    class: patch.class || prior?.class || "unclassified",
    label: patch.label || prior?.label || id,
    status,
    context: patch.context ?? prior?.context,
    notes: patch.notes ?? prior?.notes,
    evidence: patch.evidence ?? prior?.evidence,
  });
}

/** Seed finite discrete + family/context cases as PENDING before physical run. */
export function seedExhaustiveCasePlan() {
  // Reload prior ledger so a worker restart does not wipe VERIFIED history.
  loadLedgerFromDisk();
  const effectIds = EFFECT_RECIPES.map((e) => e.id);
  const materialIds = MATERIAL_CATALOG.map((m) => m.id);
  const shapeIds = BADGE_SHAPE_DEFS.map((s) => s.id);

  for (const id of effectIds) {
    for (const family of ["text", "button", "badge"] as const) {
      ensureLedgerCase({
        id: `discrete.effect.${family}.${id}`,
        class: "discrete-effect",
        label: `Effect ${id} on ${family}`,
        status: "PENDING",
        context: `${family}:first-use`,
      });
    }
  }

  for (const id of materialIds) {
    for (const family of ["button", "badge", "text"] as const) {
      ensureLedgerCase({
        id: `discrete.material.${family}.${id}`,
        class: "discrete-material",
        label: `Material ${id} on ${family}`,
        status: "PENDING",
        context: `${family}:appearance-material`,
      });
    }
  }

  for (const id of shapeIds) {
    ensureLedgerCase({
      id: `discrete.badge-shape.${id}`,
      class: "discrete-shape",
      label: `Badge shape ${id}`,
      status: "PENDING",
      context: "badge:shape",
    });
  }

  for (const preset of STARTER_BUTTON_PRESETS) {
    ensureLedgerCase({
      id: `discrete.button-preset.${preset.id}`,
      class: "discrete-preset",
      label: `Button preset ${preset.id}`,
      status: "PENDING",
    });
  }
  for (const preset of STARTER_TEXT_COMBINATIONS) {
    ensureLedgerCase({
      id: `discrete.text-combo.${preset.id}`,
      class: "discrete-preset",
      label: `Text combination ${preset.id}`,
      status: "PENDING",
    });
  }
  for (const preset of STARTER_COUPON_LAYOUTS) {
    ensureLedgerCase({
      id: `discrete.coupon.${preset.id}`,
      class: "discrete-preset",
      label: `Coupon ${preset.id}`,
      status: "PENDING",
    });
  }
  for (const preset of STARTER_TICKET_LAYOUTS) {
    ensureLedgerCase({
      id: `discrete.ticket.${preset.id}`,
      class: "discrete-preset",
      label: `Ticket ${preset.id}`,
      status: "PENDING",
    });
  }
  for (const preset of [...STARTER_BADGE_SHAPES, ...STARTER_BADGE_COMPOSITIONS]) {
    ensureLedgerCase({
      id: `discrete.badge-preset.${preset.id}`,
      class: "discrete-preset",
      label: `Badge preset ${preset.id}`,
      status: "PENDING",
    });
  }

  for (const surface of INSERT_SURFACES) {
    const cats = appearanceCategoriesForFamily(surface.family);
    for (const cat of cats) {
      ensureLedgerCase({
        id: `appearance.${surface.family}.${cat.id}.first-use`,
        class: "appearance-category",
        label: `${surface.family} Appearance › ${cat.label}`,
        status: "PENDING",
        context: "first-use-after-insert",
      });
    }
    ensureLedgerCase({
      id: `transform.${surface.family}.drag`,
      class: "physical-transform",
      label: `${surface.family} drag`,
      status: "PENDING",
    });
    ensureLedgerCase({
      id: `transform.${surface.family}.resize`,
      class: "physical-transform",
      label: `${surface.family} resize`,
      status: "PENDING",
    });
    ensureLedgerCase({
      id: `transform.${surface.family}.rotate`,
      class: "physical-transform",
      label: `${surface.family} rotate`,
      status: "PENDING",
    });
    ensureLedgerCase({
      id: `toolbar-crawl.${surface.family}`,
      class: "toolbar-door",
      label: `${surface.family} toolbar door crawl`,
      status: "PENDING",
    });
  }

  for (const ctx of [
    "group.create",
    "group.move",
    "group.resize",
    "group.rotate",
    "group.appearance",
    "group.edit-contents",
    "group.child-edit",
    "group.finish",
    "group.duplicate",
    "group.ungroup",
    "group.undo-redo",
  ] as const) {
    ensureLedgerCase({
      id: `group.${ctx}`,
      class: "group-matrix",
      label: ctx,
      status: "PENDING",
    });
  }

  return writeExhaustiveLedger();
}

function loadLedgerFromDisk() {
  const file = path.join(EVIDENCE_ROOT, "_reports", "exhaustive-ledger.json");
  if (!fs.existsSync(file)) return;
  try {
    const prior = JSON.parse(fs.readFileSync(file, "utf8")) as { cases?: LedgerCase[] };
    for (const entry of prior.cases || []) {
      const existing = cases.get(entry.id);
      if (!existing || existing.status === "PENDING") cases.set(entry.id, entry);
      else if (entry.status === "VERIFIED") cases.set(entry.id, entry);
    }
  } catch {
    /* ignore corrupt ledger */
  }
}

export function writeExhaustiveLedger() {
  const list = [...cases.values()];
  const counts = {
    PENDING: list.filter((c) => c.status === "PENDING").length,
    VERIFIED: list.filter((c) => c.status === "VERIFIED").length,
    BROKEN: list.filter((c) => c.status === "BROKEN").length,
    BLOCKED: list.filter((c) => c.status === "BLOCKED").length,
    NOT_APPLICABLE: list.filter((c) => c.status === "NOT_APPLICABLE").length,
    DEFERRED_BY_SCOPE: list.filter((c) => c.status === "DEFERRED_BY_SCOPE").length,
  };
  const discrete = {
    effectsTotal: EFFECT_RECIPES.length,
    materialsTotal: MATERIAL_CATALOG.length,
    badgeShapesTotal: BADGE_SHAPE_DEFS.length,
    buttonPresetsTotal: STARTER_BUTTON_PRESETS.length,
    textCombosTotal: STARTER_TEXT_COMBINATIONS.length,
    couponsTotal: STARTER_COUPON_LAYOUTS.length,
    ticketsTotal: STARTER_TICKET_LAYOUTS.length,
    effectsVerified: list.filter((c) => c.class === "discrete-effect" && c.status === "VERIFIED").length,
    materialsVerified: list.filter((c) => c.class === "discrete-material" && c.status === "VERIFIED").length,
    shapesVerified: list.filter((c) => c.class === "discrete-shape" && c.status === "VERIFIED").length,
    presetsVerified: list.filter((c) => c.class === "discrete-preset" && c.status === "VERIFIED").length,
  };
  const report = {
    generatedAt: new Date().toISOString(),
    standard: "EXHAUSTIVE_PHYSICAL_INTERACTION",
    totalCases: list.length,
    unresolved: counts.PENDING,
    counts,
    discrete,
    cases: list,
  };
  const file = path.join(EVIDENCE_ROOT, "_reports", "exhaustive-ledger.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  return report;
}

export function ledgerSummary() {
  return writeExhaustiveLedger();
}
