import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const enabled = process.env.STUDIO_REVIEW_ENTRY_ACCEPTANCE === "1";
const evidence = path.join("tmp", "studio-review-entry");

test("opens the Rich Studio review entry from a fresh browser state", async ({ browser }) => {
  test.skip(!enabled, "Set STUDIO_REVIEW_ENTRY_ACCEPTANCE=1 for the isolated local review runtime");
  mkdirSync(evidence, { recursive: true });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  expect(await context.cookies()).toEqual([]);
  const page = await context.newPage();
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/review/studio", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/dashboard\/card\/edit$/);
  await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible();
  await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute(
    "data-session-restored",
    "true"
  );
  await expect(page.getByText("The Monkey Cage · Slice 1 Review", { exact: true }).first()).toBeVisible();

  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "tapconnect_control_identity")?.value).toBe(
    "rich"
  );
  expect(cookies.find((cookie) => cookie.name === "tapconnect_workspace_id")?.value).toBeTruthy();
  expect(cookies.some((cookie) => cookie.name === "tapconnect_view_as")).toBe(false);
  expect(cookies.some((cookie) => cookie.name === "tapconnect_support_session")).toBe(false);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);

  await page.screenshot({ path: path.join(evidence, "fresh-rich-studio-entry.png"), fullPage: true });
  await context.close();
});

test("replaces stale local identity and workspace context before Studio loads", async ({ browser }) => {
  test.skip(!enabled, "Set STUDIO_REVIEW_ENTRY_ACCEPTANCE=1 for the isolated local review runtime");
  const context = await browser.newContext();
  await context.addCookies(
    [
      ["tapconnect_control_identity", "stale"],
      ["tapconnect_workspace_id", "stale"],
      ["tapconnect_view_as", "stale"],
      ["tapconnect_support_session", "stale"],
    ].map(([name, value]) => ({ name, value, url: "http://127.0.0.1:3050" }))
  );
  const page = await context.newPage();
  await page.addInitScript(() => {
    sessionStorage.setItem("tapconnect:studio-reconstitution:v2", JSON.stringify({
      version: 2,
      drawer: { mode: "focused", activeRailId: "add", path: ["assets"], query: "stale", scrollOffset: 300, placementMode: "insert", applyTargetId: null },
      inspectorOpen: false,
      assemblyInspectorOpen: true,
      compositionInspectorOpen: false,
      inspectorSection: "content",
      viewport: "phone",
      adaptiveWorkspace: {
        contractId: "studioAdaptiveWorkspace@1.0.0",
        activeTaskId: "adjust-resource",
        composition: "deep-edit",
        returnStack: [],
        transitionSerial: 12,
      },
    }));
  });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/review/studio", { waitUntil: "networkidle" });
  await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible();
  await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-workspace-task", "compose-card");
  await expect(page.getByTestId("studio-reconstitution-shell")).toHaveAttribute("data-workspace-composition", "compose");
  await expect(page.getByTestId("studio-assembly-inspector")).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Adjust identity crop" })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Media & Asset Browser" })).toHaveCount(0);
  await expect(page.getByTestId("studio-preview")).toBeVisible();
  await expect(page.getByTestId("preview-live-device")).toBeVisible();
  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "tapconnect_control_identity")?.value).toBe(
    "rich"
  );
  expect(cookies.find((cookie) => cookie.name === "tapconnect_workspace_id")?.value).not.toBe(
    "stale"
  );
  expect(cookies.some((cookie) => cookie.name === "tapconnect_view_as")).toBe(false);
  expect(cookies.some((cookie) => cookie.name === "tapconnect_support_session")).toBe(false);
  expect(pageErrors).toEqual([]);
  await context.close();
});
