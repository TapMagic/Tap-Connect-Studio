import assert from "node:assert/strict";
import test from "node:test";
import { phonePreviewEntryUrl } from "../entry-target";

const page = {
  pageId: "page-live",
  title: "Live",
  homePageId: "page-home",
  homeTitle: "Home",
};

test("Phone Preview targets Home or Current Page without changing its signed token", () => {
  const authority = "https://studio.example/preview/live/signed-token?debug=1";
  const current = phonePreviewEntryUrl(authority, "current", page);
  const home = phonePreviewEntryUrl(authority, "home", page);

  assert.equal(new URL(current).pathname, "/preview/live/signed-token");
  assert.equal(new URL(current).searchParams.get("page"), "page-live");
  assert.equal(new URL(current).searchParams.get("debug"), "1");
  assert.equal(new URL(home).pathname, "/preview/live/signed-token");
  assert.equal(new URL(home).searchParams.get("page"), null);
  assert.equal(new URL(home).searchParams.get("debug"), "1");
});

test("legacy single-Page preview URL remains unchanged", () => {
  const authority = "https://studio.example/preview/live/signed-token";
  assert.equal(phonePreviewEntryUrl(authority, "current", null), authority);
});
