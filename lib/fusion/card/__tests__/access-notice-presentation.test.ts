import assert from "node:assert/strict";
import test from "node:test";
import { accessNoticeContent } from "../access-notice";
import { EXPERIENCE_SHELL_LAYERS } from "../experience-shell-layers";

test("access notices derive human-facing defaults without developer terminology", () => {
  assert.deepEqual(accessNoticeContent({
    actionLabel: "Founder Access",
    message: "Requires Founder Tier access or higher.",
  }), {
    title: "Founder Access Required",
    message: "Requires Founder Tier access or higher.",
  });
  assert.deepEqual(accessNoticeContent({ actionLabel: "VIP Lounge" }), {
    title: "VIP Lounge Access Required",
    message: "This content requires additional access.",
  });
});

test("authored access notice copy remains authoritative", () => {
  assert.deepEqual(accessNoticeContent({
    actionLabel: "Vault",
    title: "Membership Required",
    message: "Join to unlock this collectible.",
  }), {
    title: "Membership Required",
    message: "Join to unlock this collectible.",
  });
});

test("access notices are governed above authored content, persistent furniture, and navigation", () => {
  assert.ok(EXPERIENCE_SHELL_LAYERS.content < EXPERIENCE_SHELL_LAYERS.persistent);
  assert.ok(EXPERIENCE_SHELL_LAYERS.persistent < EXPERIENCE_SHELL_LAYERS.navigation);
  assert.ok(EXPERIENCE_SHELL_LAYERS.navigation < EXPERIENCE_SHELL_LAYERS.accessNotice);
});
