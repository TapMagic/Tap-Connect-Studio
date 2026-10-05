import assert from "node:assert/strict";
import test from "node:test";
import type { TapExperiencePage } from "@/lib/brand/tap-card";
import { internalPageDestinationOptions, isEligibleInternalPageDestination } from "../internal-page-destination";

const page = (pageId: string, patch: Partial<TapExperiencePage> = {}): TapExperiencePage => ({
  pageId,
  experienceId: "experience-test",
  title: pageId.replace("page-", ""),
  slug: pageId,
  navLabel: pageId.replace("page-", ""),
  navIconRef: "house",
  navOrder: 0,
  navVisible: true,
  pageVisible: true,
  navDestinationPageId: pageId,
  access: { state: "public" },
  analyticsId: `test:${pageId}`,
  createdAt: "2026-10-04T00:00:00.000Z",
  updatedAt: "2026-10-04T00:00:00.000Z",
  composition: { sections: [] },
  ...patch,
});

test("internal Page destinations group navigation, other, and unavailable Pages", () => {
  const pages = [
    page("page-home"),
    page("page-afterparty", { navVisible: false }),
    page("page-vault", { access: { state: "locked", ruleRef: "member", lockedBehavior: { mode: "message", message: "Members only" } } }),
    page("page-hidden", { pageVisible: false }),
    page("page-secret", { access: { state: "locked", ruleRef: "secret", lockedBehavior: { mode: "hidden" } } }),
  ];
  const options = internalPageDestinationOptions(pages);
  assert.deepEqual(options.map((option) => [option.pageId, option.status, option.selectable]), [
    ["page-home", "in-navigation", true],
    ["page-vault", "in-navigation", true],
    ["page-afterparty", "other-page", true],
    ["page-hidden", "unavailable", false],
    ["page-secret", "unavailable", false],
  ]);
  assert.equal(isEligibleInternalPageDestination(pages, "page-afterparty"), true);
  assert.equal(isEligibleInternalPageDestination(pages, "page-secret"), false);
  assert.deepEqual(internalPageDestinationOptions(pages, "after").map((option) => option.pageId), ["page-afterparty"]);
});
