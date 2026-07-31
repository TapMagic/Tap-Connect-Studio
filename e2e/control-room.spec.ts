import { mkdirSync } from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const evidence = path.resolve(process.cwd(), "tmp/control-room-owner-evidence");

async function expectNoAxeViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.slice(0, 3).map((node) => node.target),
    })),
  ).toEqual([]);
}

async function createFixtureInvitation(
  page: Page,
  input: { name: string; email: string; status: "DRAFT" | "SENT" },
) {
  await page.getByRole("button", { name: "Invite administrator" }).click();
  await page.getByRole("textbox", { name: /^Email/ }).fill(input.email);
  await page.getByRole("textbox", { name: /^Display name/ }).fill(input.name);
  await page
    .getByRole("combobox", { name: /^Initial platform role/ })
    .selectOption({ label: "Read-Only Analyst" });
  await page
    .getByRole("combobox", { name: /^Invitation state/ })
    .selectOption(input.status);
  await page
    .getByRole("textbox", { name: /^Internal note/ })
    .fill("Owner acceptance fixture invitation");
  await page.getByRole("button", { name: "Review and apply" }).click();
}

test.describe.serial("TapConnect Platform Control Room owner acceptance", () => {
  test.setTimeout(180_000);

  test.beforeAll(() => mkdirSync(evidence, { recursive: true }));

  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: "tapconnect_control_identity",
        value: "rich",
        url: process.env.BASE_URL ?? "http://127.0.0.1:3011",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  });

  test("unauthorized identity is rejected and Platform Owner enters", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "tapconnect_control_identity",
        value: "visitor",
        url: process.env.BASE_URL ?? "http://127.0.0.1:3011",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await page.goto("/control", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/control\/unauthorized$/);
    await expect(
      page.getByRole("heading", { name: "Control Room access is not assigned." }),
    ).toBeVisible();

    await context.addCookies([
      {
        name: "tapconnect_control_identity",
        value: "rich",
        url: process.env.BASE_URL ?? "http://127.0.0.1:3011",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await page.goto("/control", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", {
        name: "Everything that governs Studio, in one place.",
      }),
    ).toBeVisible();
    await expect(page.getByText("LOCAL — FIXTURE DATA ONLY")).toBeVisible();
    await expect(page.getByText("Platform Owner").first()).toBeVisible();
  });

  test("all nine implemented areas and fixture identities are visible", async ({
    page,
  }) => {
    await page.goto("/control", { waitUntil: "networkidle" });
    const navigation = page.getByRole("navigation", { name: "Control Room" });
    for (const name of [
      "Overview",
      "Users",
      "Workspaces",
      "Access",
      "Plans",
      "Support",
      "Demos",
      "Audit",
      "Settings",
    ]) {
      await expect(navigation.getByRole("button", { name })).toBeVisible();
    }
    await navigation.getByRole("button", { name: "Users" }).click();
    await expect(
      page.getByRole("heading", { name: "Users & Administrators" }),
    ).toBeVisible();
    const userSearch = page.getByPlaceholder("Search user directory");
    await userSearch.fill("rich@tapconnect.local");
    await expect(page.getByRole("button", { name: /Rich/ }).first()).toBeVisible();
    await userSearch.fill("daniel@tapconnect.local");
    await expect(page.getByRole("button", { name: /Daniel/ }).first()).toBeVisible();
    await page.goto("/control?section=businesses", { waitUntil: "networkidle" });
    const businessSearch = page.getByPlaceholder("Search business directory");
    await businessSearch.fill("The Monkey Cage");
    await expect(page.getByText("The Monkey Cage").first()).toBeVisible();
    await businessSearch.fill("I Promote That");
    await expect(page.getByText("I Promote That").first()).toBeVisible();
    await page.goto("/control?section=roles", { waitUntil: "networkidle" });
    await page
      .getByRole("combobox", { name: "Compare with role" })
      .selectOption({ label: "Platform Operator" });
    await expect(page.locator(".control-role-diff")).toContainText("Platform Operator");
    await expect(page.locator(".control-role-diff")).toContainText("only in");
  });

  test("shared workspace menu opens real Studio context and returns to Control Room", async ({
    page,
  }) => {
    await page.goto("/control?section=businesses", { waitUntil: "networkidle" });
    await page.getByTestId("control-workspace-menu").getByRole("button").first().click();
    await expect(
      page.getByRole("dialog", { name: "Workspace and user menu" }).getByText(
        "Operating as myself",
      ),
    ).toBeVisible();
    await page
      .getByTestId("control-workspace-menu")
      .getByRole("button", { name: /The Monkey Cage internal/ })
      .click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId("studio-context-banner")).toContainText("The Monkey Cage");
    await expect(page.getByTestId("studio-workspace-menu")).toBeVisible();
    await page.getByRole("link", { name: "Return to Control Room" }).first().click();
    await expect(page).toHaveURL(/\/control\?section=businesses/);
    await expect(
      page.getByRole("heading", { name: "Businesses & Workspaces" }),
    ).toBeVisible();
  });

  test("workspace context rejects non-membership and preserves Daniel's own sandbox", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "tapconnect_control_identity",
        value: "daniel",
        url: process.env.BASE_URL ?? "http://127.0.0.1:3011",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await page.goto("/control?section=businesses", { waitUntil: "networkidle" });
    await page.getByPlaceholder("Search business directory").fill("Rich’s Sandbox");
    const richSandboxRow = page.getByRole("row").filter({ hasText: "Rich’s Sandbox" });
    const richOpen = richSandboxRow.getByTestId(/open-studio-/);
    const richBusinessId = (await richOpen.getAttribute("data-testid"))!.replace(
      "open-studio-",
      "",
    );
    const denied = await page.request.post("/api/workspace/context", {
      data: { businessId: richBusinessId, returnTo: "/control?section=businesses" },
    });
    expect(denied.status()).toBe(403);

    await page.getByTestId("control-workspace-menu").getByRole("button").first().click();
    await page
      .getByTestId("control-workspace-menu")
      .getByRole("button", { name: /Daniel’s Sandbox/ })
      .click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId("studio-context-banner")).toContainText("Daniel’s Sandbox");
  });

  test("fixture invitation visibly accepts, revokes, and expires without Email", async ({
    page,
  }) => {
    const runId = Date.now().toString(36);
    const acceptedName = `Acceptance Fixture ${runId}`;
    const acceptedEmail = `acceptance-${runId}@tapconnect.local`;
    await page.goto("/control?section=users", { waitUntil: "networkidle" });
    await createFixtureInvitation(page, {
      name: acceptedName,
      email: acceptedEmail,
      status: "SENT",
    });
    await expect(page.getByText("Secure fixture link")).toBeVisible();
    await expect(page.getByText("No Email or customer contact occurred.")).toBeVisible();
    const invitationPath = await page.locator(".control-result-link code").innerText();
    await page.screenshot({
      path: path.join(evidence, "01-invitation-secure-link.png"),
      fullPage: true,
    });
    await page.goto(invitationPath, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Accept invitation" }).click();
    await expect(
      page.getByText("Invitation accepted and immutable identity bound."),
    ).toBeVisible();
    await page.goto("/control?section=users", { waitUntil: "networkidle" });
    await page.getByPlaceholder("Search user directory").fill(acceptedEmail);
    const acceptedUser = page.getByRole("row").filter({
      hasText: acceptedEmail,
    }).first();
    await expect(acceptedUser.getByText(/local:invited:/)).toBeVisible();
    await page.goto("/control?section=businesses", { waitUntil: "networkidle" });
    await page.getByPlaceholder("Search business directory").fill(`${acceptedName}’s Sandbox`);
    await expect(page.getByText(`${acceptedName}’s Sandbox`).first()).toBeVisible();

    await page.goto("/control?section=users", { waitUntil: "networkidle" });
    await createFixtureInvitation(page, {
      name: `Revocation Fixture ${runId}`,
      email: `revocation-${runId}@tapconnect.local`,
      status: "SENT",
    });
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("tab", { name: /Invitations/ }).click();
    const revokedRow = page.getByRole("row").filter({ hasText: `Revocation Fixture ${runId}` }).first();
    await revokedRow.getByRole("button", { name: /Revoke Revocation Fixture/ }).click();
    await page.getByLabel("Reason").fill("Owner acceptance revocation");
    await page.getByRole("button", { name: "Confirm consequence" }).click();
    await expect(revokedRow.getByText("REVOKED")).toBeVisible();
    await page.getByRole("button", { name: "Dismiss" }).click();

    await createFixtureInvitation(page, {
      name: `Expiration Fixture ${runId}`,
      email: `expiration-${runId}@tapconnect.local`,
      status: "DRAFT",
    });
    const expiredRow = page.getByRole("row").filter({ hasText: `Expiration Fixture ${runId}` }).first();
    await expiredRow.getByRole("button", { name: /Expire Expiration Fixture/ }).click();
    await expect(expiredRow.getByText("EXPIRED")).toBeVisible();
  });

  test("Daniel sees granted Control Room areas and explicit direct denial", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "tapconnect_control_identity",
        value: "daniel",
        url: process.env.BASE_URL ?? "http://127.0.0.1:3011",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await page.goto("/control?section=users", { waitUntil: "networkidle" });
    await page.getByPlaceholder("Search user directory").fill("daniel@tapconnect.local");
    await expect(page.getByText("Platform Operator").first()).toBeVisible();
    await expect(page.getByText("Demo Manager").first()).toBeVisible();
    const danielRow = page.getByRole("row").filter({ hasText: "daniel@tapconnect.local" });
    await expect(
      danielRow.getByText(/DENY: entitlements\.unlimited_grant/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Settings" }),
    ).toBeVisible();
  });

  test("View as User is read-only and Support Session blocks role assignment", async ({
    page,
  }) => {
    await page.goto("/control?section=support", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Choose user" }).click();
    await page
      .getByRole("combobox", { name: /^User/ })
      .selectOption({ label: "Daniel — daniel@tapconnect.local" });
    await page.getByRole("textbox", { name: /^Diagnostic reason/ }).fill(
      "Owner acceptance read-only navigation proof",
    );
    await page.getByRole("button", { name: "Review and apply" }).click();
    await expect(page.getByText("View as User — read-only")).toBeVisible();

    await page.goto("/control?section=users", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Invite administrator" }).click();
    await page.getByRole("textbox", { name: /^Email/ }).fill("blocked@tapconnect.local");
    await page.getByRole("textbox", { name: /^Display name/ }).fill("Blocked Fixture");
    await page
      .getByRole("combobox", { name: /^Initial platform role/ })
      .selectOption({ label: "Read-Only Analyst" });
    await page.getByRole("button", { name: "Review and apply" }).click();
    await expect(
      page.getByText(/View as User is permanently read-only/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Exit view" }).click();
    await expect(page.getByText("View as User — read-only")).toBeHidden();

    await page.goto("/control?section=support", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Prepare session" }).click();
    await page
      .getByRole("combobox", { name: /^Subject user/ })
      .selectOption({ label: "Daniel — daniel@tapconnect.local" });
    await page.getByRole("spinbutton", { name: /^Duration in minutes/ }).fill("15");
    await page.getByRole("textbox", { name: /^Support reason/ }).fill(
      "Owner acceptance governed support proof",
    );
    await page.getByRole("button", { name: "Review and apply" }).click();
    await expect(page.getByText("Support session", { exact: true })).toBeVisible();
    await expect(page.getByText(/Restricted actions are blocked/)).toBeVisible();

    await page.goto("/control?section=roles", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Read-Only Analyst/ }).click();
    await page.getByRole("button", { name: "Assign", exact: true }).click();
    await page
      .getByRole("combobox", { name: /^Administrator/ })
      .selectOption({ label: "Daniel — daniel@tapconnect.local" });
    await page.getByRole("textbox", { name: /^Reason/ }).fill(
      "This role assignment must remain blocked",
    );
    await page.getByRole("button", { name: "Review and apply" }).click();
    await expect(
      page.getByText("Blocked while acting in a Support Session."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Exit support session" }).click();
    await expect(page.getByText("Support session", { exact: true })).toBeHidden();
  });

  test("Demo Card publication and landing binding use visible workflows", async ({
    page,
  }) => {
    const demoRunId = Date.now().toString(36);
    const privateDemoName = `Owner Private Demo ${demoRunId}`;
    await page.goto("/control?section=demo", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Create Demo" }).click();
    await page.getByRole("textbox", { name: /^Demo name/ }).fill(privateDemoName);
    await page.getByRole("textbox", { name: /^What this Demo should show/ }).fill("Private promotion acceptance fixture");
    await page.getByRole("textbox", { name: /^Industry/ }).fill("Owner acceptance");
    await page.getByRole("textbox", { name: /^Where the Demo content comes from/ }).fill("Synthetic local-only owner acceptance data");
    await page.getByRole("textbox", { name: /^Why this Demo is being created/ }).fill("Create governed private demo");
    await page.getByRole("button", { name: "Review and apply" }).click();
    await expect(page.getByText("Demo workspace ready")).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit Card in Studio" })).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    let privateDemo = page.locator("article").filter({ hasText: privateDemoName });
    await privateDemo.getByRole("button", { name: `Open ${privateDemoName} workflows` }).click();
    await page.getByRole("button", { name: "Submit to shared portfolio" }).click();
    await page.getByLabel("Reason").fill("Submit private Demo for review");
    await page.getByRole("button", { name: "Review and apply" }).click();
    privateDemo = page.locator("article").filter({ hasText: privateDemoName });
    await expect(privateDemo.getByText("Submitted")).toBeVisible();
    await privateDemo.getByRole("button", { name: `Open ${privateDemoName} workflows` }).click();
    await page.getByRole("button", { name: "Review portfolio submission" }).click();
    await page.getByLabel("Review note").fill("Approved for the safe shared Demo Portfolio");
    await page.getByRole("button", { name: "Review and apply" }).click();
    privateDemo = page.locator("article").filter({ hasText: privateDemoName });
    await expect(privateDemo.getByText("Approved")).toBeVisible();
    await privateDemo.getByRole("button", { name: `Open ${privateDemoName} workflows` }).click();
    await page.getByLabel("Reason").fill("Clone approved demo for isolated reuse");
    await page.getByRole("button", { name: "Review and apply" }).click();
    await expect(page.getByText("Demo cloned with a Studio-ready Card draft.")).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    await page.getByRole("button", { name: "Dismiss" }).click();
    privateDemo = page.locator("article").filter({ hasText: privateDemoName }).first();
    await privateDemo.getByRole("button", { name: "Reset" }).click();
    await page.getByLabel("Reason").fill("Reset synthetic Demo fixture");
    await page.getByRole("button", { name: "Confirm consequence" }).click();
    await expect(page.getByText("Demo reset to its governed fixture baseline.")).toBeVisible();
    await page.getByRole("button", { name: "Dismiss" }).click();

    const card = page.locator("article").filter({ hasText: "TapConnect Core Demo" });
    const coreStudioButton = card.getByTestId(/open-studio-/).first();
    const coreBusinessId = (await coreStudioButton.getAttribute("data-testid"))!.replace(
      "open-studio-",
      "",
    );
    const contextResponse = await page.request.post("/api/workspace/context", {
      data: { businessId: coreBusinessId, returnTo: "/control?section=demo" },
    });
    expect(contextResponse.ok()).toBeTruthy();
    const draftResponse = await page.request.get("/api/card/draft");
    expect(draftResponse.ok()).toBeTruthy();
    const draftState = await draftResponse.json();
    const draftMarker = `Saved draft ${demoRunId}`;
    const nextDraft = {
      ...draftState.draft,
      identity: {
        ...(draftState.draft.identity ?? {}),
        tagline: draftMarker,
      },
    };
    const saveResponse = await page.request.put("/api/card/draft", {
      data: {
        draft: nextDraft,
        expectedRevision: draftState.revision,
      },
    });
    expect(saveResponse.ok()).toBeTruthy();
    await page.goto("/control?section=demo", { waitUntil: "networkidle" });
    const refreshedDraftCard = page
      .locator("article")
      .filter({ hasText: "TapConnect Core Demo" });
    await refreshedDraftCard
      .getByRole("button", { name: "Publish saved draft" })
      .click();
    await page.getByLabel("Reason").fill("Owner acceptance Demo publication");
    await page.getByRole("button", { name: "Review and apply" }).click();
    await expect(page.getByText(/Current saved Demo Card draft published safely/)).toBeVisible();
    const refreshedCard = page
      .locator("article")
      .filter({ hasText: "TapConnect Core Demo" });
    await refreshedCard.getByRole("button", { name: "Bind to landing" }).click();
    await page.getByLabel("Publication reason").fill("Owner acceptance landing binding");
    await page.getByRole("button", { name: "Review and apply" }).click();
    await expect(
      page.getByText(/Published Demo Card bound to the landing slot/),
    ).toBeVisible();
    const rollback = page.getByRole("button", { name: "Roll back" });
    await expect(rollback).toBeVisible();
    await rollback.click();
    await page.getByLabel("Reason").fill("Owner acceptance landing rollback");
    await page.getByRole("button", { name: "Confirm consequence" }).click();
    await expect(page.getByText("Landing Demo binding rolled back.")).toBeVisible();
    await page.getByRole("button", { name: "Dismiss" }).click();
    await page.getByRole("button", { name: "Unbind" }).click();
    await page.getByLabel("Reason").fill("Owner acceptance fallback proof");
    await page.getByRole("button", { name: "Confirm consequence" }).click();
    await expect(page.getByText(/public fallback is active/)).toBeVisible();
    const fallbackResponse = await page.request.get("/api/public/demo-card/primary-card");
    expect((await fallbackResponse.json()).bound).toBe(false);
    await page.getByRole("button", { name: "Dismiss" }).click();
    await refreshedCard.getByRole("button", { name: "Bind to landing" }).click();
    await page.getByLabel("Publication reason").fill("Restore owner acceptance binding");
    await page.getByRole("button", { name: "Review and apply" }).click();
    await page.screenshot({
      path: path.join(evidence, "02-demo-binding-desktop.png"),
      fullPage: true,
    });

    const response = await page.request.get("/api/public/demo-card/primary-card");
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.bound).toBe(true);
    expect(payload.card).toBeTruthy();
    expect(JSON.stringify(payload.card)).toContain(draftMarker);
    expect(JSON.stringify(payload)).not.toMatch(/token|secret|password|clerk/i);
  });

  test("desktop and 390px layouts, keyboard focus, and axe pass", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/control", { waitUntil: "networkidle" });
    await page.bringToFront();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to main content" }),
    ).toBeFocused();
    await expectNoAxeViolations(page);
    await page.keyboard.press("Meta+k");
    await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Command palette" })).toBeHidden();
    await page.screenshot({
      path: path.join(evidence, "03-overview-desktop.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText("LOCAL — FIXTURE DATA ONLY")).toBeVisible();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("navigation", { name: "Control Room" }),
    ).toBeVisible();
    await expect(page.locator(".control-rail")).toHaveCSS(
      "transform",
      "matrix(1, 0, 0, 1, 0, 0)",
    );
    await page.screenshot({
      path: path.join(evidence, "04-mobile-navigation-390.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Close navigation" }).click();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    );
    expect(overflow).toBe(false);
    await expectNoAxeViolations(page);
    await page.screenshot({
      path: path.join(evidence, "05-overview-mobile-390.png"),
      fullPage: true,
    });
  });
});
