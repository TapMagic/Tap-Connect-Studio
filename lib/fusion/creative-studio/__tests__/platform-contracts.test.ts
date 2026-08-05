import assert from "node:assert/strict";
import test from "node:test";
import { applyAiProposal } from "../ai-proposal";
import { capabilitiesForNode } from "../capabilities";
import {
  OUTPUT_PROFILES,
  canResizeCurrentDocument,
  requireResizeAllowed,
} from "../output-profiles";
import {
  createSelectionRef,
  requireCurrentSelection,
  validateSelectionRef,
  type SelectionAuthority,
} from "../selection-ref";

function authority(generation = 4): SelectionAuthority {
  return {
    documentId: "card-1",
    pageId: "card-page",
    revision: 12,
    selectionGeneration: generation,
    objects: new Map([
      ["section-a", { kind: "section", parentId: "card-page" }],
      ["button-a", { kind: "element", parentId: "section-a" }],
      ["badge-a", { kind: "element", parentId: "section-b" }],
    ]),
  };
}

const buttonSelection = createSelectionRef({
  documentId: "card-1",
  pageId: "card-page",
  revision: 12,
  objectKind: "element",
  objectId: "button-a",
  parentId: "section-a",
  selectionGeneration: 4,
});

test("SelectionRef rejects stale and wrong-target mutations rather than guessing", () => {
  assert.equal(validateSelectionRef(buttonSelection, authority()).ok, true);
  const stale = validateSelectionRef(buttonSelection, authority(5));
  assert.deepEqual(stale.ok ? null : stale.reason, "stale_selection");

  const movedAuthority: SelectionAuthority = {
    ...authority(),
    objects: new Map([["button-a", { kind: "element", parentId: "section-b" }]]),
  };
  const moved = validateSelectionRef(buttonSelection, movedAuthority);
  assert.deepEqual(moved.ok ? null : moved.reason, "wrong_parent");
  assert.throws(() => requireCurrentSelection(buttonSelection, movedAuthority), /Reselect/i);
});

test("rapid Section, Badge, Button, and root switching cannot cross-write", () => {
  const targets = [
    createSelectionRef({ ...buttonSelection, objectId: "section-a", objectKind: "section", parentId: "card-page", selectionGeneration: 1 }),
    createSelectionRef({ ...buttonSelection, objectId: "badge-a", parentId: "section-b", selectionGeneration: 2 }),
    createSelectionRef({ ...buttonSelection, selectionGeneration: 3 }),
    createSelectionRef({ ...buttonSelection, objectId: "card-page", objectKind: "root_surface", parentId: null, selectionGeneration: 4 }),
  ];
  const current: SelectionAuthority = {
    ...authority(4),
    objects: new Map([["card-page", { kind: "root_surface", parentId: null }]]),
  };
  assert.deepEqual(
    targets.map((selection) => validateSelectionRef(selection, current).ok),
    [false, false, false, true]
  );
});

test("one capability registry serves Text, Button labels, Badges, Maps, and interactive images", () => {
  const text = capabilitiesForNode({ primitive: "text", props: { elementKind: "heading" } });
  const button = capabilitiesForNode({ primitive: "button", props: { elementKind: "button" } });
  const badge = capabilitiesForNode({ primitive: "image", props: { elementKind: "badge" } });
  const map = capabilitiesForNode({ primitive: "image", props: { elementKind: "map" } });
  assert(text.has("text"));
  assert(text.has("action"));
  assert(text.has("appearance"));
  assert(button.has("text"));
  assert(button.has("surface"));
  assert(button.has("action"));
  assert(badge.has("surface"));
  assert(badge.has("action"));
  assert(map.has("media"));
  assert(map.has("action"));
  assert([...text].filter((capability) => capability === "motion").length === 1);
});

test("structured Components expose only parent-relevant capability groups", () => {
  const gallery = capabilitiesForNode({ primitive: "group", props: { componentKind: "gallery" } });
  const coupon = capabilitiesForNode({ primitive: "frame", props: { componentKind: "coupon" } });
  assert.equal(gallery.has("text"), false);
  assert.equal(gallery.has("media"), true);
  assert.equal(gallery.has("layout"), true);
  assert.equal(coupon.has("text"), true);
  assert.equal(coupon.has("action"), true);
});

test("output profiles are versioned and Tap Card current resize is prohibited", () => {
  const story = OUTPUT_PROFILES.find((profile) => profile.id === "social-story")!;
  const letter = OUTPUT_PROFILES.find((profile) => profile.id === "us-letter")!;
  assert.equal(story.label.includes("1080 × 1920"), true);
  assert.equal(letter.dpi, 300);
  assert.equal(canResizeCurrentDocument("tap_card", story), false);
  assert.equal(canResizeCurrentDocument("flyer", story), true);
  assert.throws(() => requireResizeAllowed("tap_card", story), /related editable variation/i);
});

test("AI applies through current SelectionRef and preserves functional bindings by default", () => {
  const before = {
    fill: "#111827",
    actionType: "call",
    href: "tel:+15551234567",
    trackingName: "call-owner",
  };
  const styled = applyAiProposal({
    value: before,
    proposal: {
      id: "proposal-1",
      scope: buttonSelection,
      summary: "Make the Button more premium",
      patch: { fill: "#b8860b", boxGlow: 14 },
      createdAt: "2026-08-03T00:00:00.000Z",
    },
    authority: authority(),
  });
  assert.equal(styled.actionType, "call");
  assert.equal(styled.href, "tel:+15551234567");
  assert.equal(styled.trackingName, "call-owner");
  assert.throws(
    () =>
      applyAiProposal({
        value: before,
        proposal: {
          id: "proposal-2",
          scope: buttonSelection,
          summary: "Unsafe destination rewrite",
          patch: { href: "https://example.invalid" },
          createdAt: "2026-08-03T00:00:00.000Z",
        },
        authority: authority(),
      }),
    /protected field: href/
  );
});
