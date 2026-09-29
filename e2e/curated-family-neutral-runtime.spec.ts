import { expect, test } from "@playwright/test";
import {
  compileSignatureAuthoringState,
  createSignatureAssemblyAuthoringState,
  setSignatureActionCount,
  type SignatureAssemblyAuthoringState,
} from "@/lib/fusion/creative-studio/signature-assets/authoring";
import {
  FAMILY_NEUTRAL_RUNTIME_FIXTURE_ID,
} from "@/lib/fusion/creative-studio/signature-assets/family-neutral-runtime-fixture";

const enabled = process.env.CURATED_FAMILY_NEUTRAL_RUNTIME_ACCEPTANCE === "1";

type RootNode = Record<string, unknown> & { siblingOrder?: number };

function fixtureState(presentationId: "fixture-single-stack" | "fixture-twin-rail", count: number, prefix: string) {
  let sequence = 0;
  const created = createSignatureAssemblyAuthoringState(
    FAMILY_NEUTRAL_RUNTIME_FIXTURE_ID,
    { presentationId },
    { idFactory: () => `${prefix}-action-${++sequence}` },
  );
  if (!created) throw new Error(`Fixture presentation ${presentationId} is unavailable.`);
  const resized = setSignatureActionCount(created, count, () => `${prefix}-action-${++sequence}`);
  return {
    ...resized,
    input: {
      ...resized.input,
      actions: resized.input.actions.map((action, index) => ({
        ...action,
        plugComponentId: undefined,
        label: index === 0 ? `${prefix} Spotify` : `${prefix} Action ${index + 1}`,
        sublabel: index === 0 ? "Secondary copy remains independently authored" : `Secondary ${index + 1}`,
        semanticLabel: index === 0 ? "Listen on Spotify" : `Open ${prefix} action ${index + 1}`,
        accessibilityLabel: index === 0 ? `Listen to ${prefix} on Spotify` : `Open ${prefix} action ${index + 1}`,
        destination: "https://open.spotify.com/",
      })),
    },
  } satisfies SignatureAssemblyAuthoringState;
}

function compileFixture(presentationId: "fixture-single-stack" | "fixture-twin-rail", count: number, prefix: string) {
  const state = fixtureState(presentationId, count, prefix);
  const compiled = compileSignatureAuthoringState(state, { blockId: `runtime-${prefix.toLowerCase().replaceAll(" ", "-")}`, label: `Runtime ${prefix}` });
  if (!compiled.ok) throw new Error(compiled.errors.map((error) => error.message).join(" "));
  return { state, compiled: compiled.composition };
}

test("swaps an existing Cabinet Noir semantic plug through Studio, Preview, and Live Device", async ({ browser, page }) => {
  test.skip(!enabled, "Set CURATED_FAMILY_NEUTRAL_RUNTIME_ACCEPTANCE=1 for the isolated local Studio runtime");
  test.setTimeout(180_000);

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/review/studio", { waitUntil: "networkidle" });
  await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible();
  const baselineResponse = await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = await baselineResponse.json() as { draft: Record<string, unknown>; revision: number };
  let phoneContext: Awaited<ReturnType<typeof browser.newContext>> | undefined;

  try {
    const cabinet = page.getByRole("group", { name: /Cabinet Noir (Standalone Action|Single Stack|Twin Rail)/ }).first();
    await expect(cabinet).toBeVisible();
    const cabinetName = await cabinet.getAttribute("aria-label");
    const plug = cabinet.locator('[data-signature-role="semantic-plug"]').first();
    const originalComponentId = await plug.getAttribute("data-signature-component-id");
    expect(originalComponentId).toBeTruthy();

    await cabinet.click();
    await page.getByTestId("studio-curated-selection-identity").click();
    const inspector = page.getByTestId("studio-assembly-inspector");
    await expect(inspector).toBeVisible();
    await inspector.getByTestId("studio-authoring-edit-contents").click();
    await inspector.getByTestId("studio-visual-browser-trigger").click();
    const browserDialog = page.getByTestId("studio-visual-browser");
    await expect(browserDialog).toBeVisible();
    const replacement = browserDialog.locator('[role="option"][aria-selected="false"]:not([disabled])').first();
    const replacementLabel = (await replacement.innerText()).trim();
    expect(replacementLabel).toBeTruthy();
    await replacement.click();
    await expect(browserDialog).toHaveCount(0);
    await expect(plug).not.toHaveAttribute("data-signature-component-id", originalComponentId!);
    const replacementComponentId = await plug.getAttribute("data-signature-component-id");
    expect(replacementComponentId).toBeTruthy();

    if (await page.getByTestId("studio-save").isEnabled()) await page.getByTestId("studio-save").click();
    await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    const persistedCabinet = page.getByRole("group", { name: cabinetName || /Cabinet Noir/ }).first();
    await expect(persistedCabinet.locator(`[data-signature-role="semantic-plug"][data-signature-component-id="${replacementComponentId}"]`).first()).toBeVisible();

    await page.getByTestId("studio-preview").click();
    await expect(page.getByTestId("studio-editor-rail")).toHaveCount(0);
    await expect(page.locator(`[data-signature-family="cabinet-noir"][data-signature-role="semantic-plug"][data-signature-component-id="${replacementComponentId}"]`).first()).toBeVisible();
    await page.getByTestId("studio-preview").click();

    await page.getByTestId("preview-live-device").click();
    await expect(page.getByTestId("live-device-qr-panel")).toHaveAttribute("data-preview-status", "ready", { timeout: 15_000 });
    const candidate = (await page.getByTestId("preview-url-text").getAttribute("href")) || "";
    const candidateUrl = new URL(candidate);
    const safeLoopbackUrl = `http://127.0.0.1:3050${candidateUrl.pathname}${candidateUrl.search}`;
    phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    expect(await phoneContext.cookies()).toEqual([]);
    const phone = await phoneContext.newPage();
    await phone.goto(safeLoopbackUrl, { waitUntil: "networkidle" });
    await expect(phone.getByTestId("preview-live-page")).toBeVisible();
    await expect(phone.locator(`[data-signature-family="cabinet-noir"][data-signature-role="semantic-plug"][data-signature-component-id="${replacementComponentId}"]`).first()).toBeVisible();
  } finally {
    await phoneContext?.close();
    const currentResponse = await page.request.get("/api/card/draft");
    if (currentResponse.ok()) {
      const current = await currentResponse.json() as { revision: number };
      const restore = await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: current.revision } });
      expect(restore.ok()).toBeTruthy();
    }
  }
});

test("proves family-neutral materials, Spotify, sublabels, presentations, layouts, Preview, and Live Device at 390px", async ({ browser, page }) => {
  test.skip(!enabled, "Set CURATED_FAMILY_NEUTRAL_RUNTIME_ACCEPTANCE=1 for the isolated local Studio runtime");
  test.setTimeout(180_000);

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/review/studio", { waitUntil: "networkidle" });
  await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible();
  const baselineResponse = await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline = await baselineResponse.json() as { draft: Record<string, unknown>; revision: number };
  const single = compileFixture("fixture-single-stack", 3, "Single Stack");
  const twin = compileFixture("fixture-twin-rail", 4, "Twin Rail");
  expect(single.state.input.actions[0].plugComponentId).toBeUndefined();
  expect(single.state.input.actions[0].plugPresentationId).toBeTruthy();
  expect(single.state.input.actions[0].semanticIconRef?.canonicalId).toBe("simple-icons:spotify");
  expect(single.compiled.block.nodes.some((node) => node.props.signatureSemanticIcon === "simple-icons:spotify" && typeof node.props.iconSvg === "string")).toBe(true);
  expect(single.compiled.presentationId).toBe("fixture-single-stack");
  expect(twin.compiled.presentationId).toBe("fixture-twin-rail");

  const draft = structuredClone(baseline.draft) as Record<string, unknown> & { rootComposition?: { nodes?: RootNode[] } };
  if (!draft.rootComposition?.nodes) throw new Error("Review draft has no canonical root composition.");
  const nextOrder = draft.rootComposition.nodes.reduce((highest, node) => Math.max(highest, Number(node.siblingOrder ?? -1)), -1) + 1;
  for (const [offset, entry] of [single, twin].entries()) {
    draft.rootComposition.nodes.push({
      id: `runtime-fixture-${offset}`,
      primitive: "frame",
      compositionKind: "module",
      parentId: null,
      siblingOrder: nextOrder + offset,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      minHeightPx: Math.ceil(entry.compiled.phone390.heightPx),
      zIndex: nextOrder + offset + 1,
      name: entry.compiled.block.label,
      visible: true,
      locked: false,
      anchor: "top-left",
      props: {
        componentKind: "curated-system",
        elementKind: "curated-system",
        curatedFamilyId: FAMILY_NEUTRAL_RUNTIME_FIXTURE_ID,
        curatedLayoutMode: entry.state.input.layoutMode,
        curatedPresentationId: entry.state.input.presentationId,
      },
      moduleComposition: entry.compiled.block,
    });
  }

  let phoneContext: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  try {
    const save = await page.request.put("/api/card/draft", { data: { draft, expectedRevision: baseline.revision } });
    expect(save.ok()).toBeTruthy();
    await page.reload({ waitUntil: "networkidle" });

    await page.getByTestId("studio-rail-add").click();
    await page.getByTestId("studio-add-buttons").click();
    await expect(page.getByTestId(`studio-button-family-${FAMILY_NEUTRAL_RUNTIME_FIXTURE_ID}`)).toHaveCount(0);
    await page.keyboard.press("Escape");

    const fixture = page.locator(`[data-signature-family="${FAMILY_NEUTRAL_RUNTIME_FIXTURE_ID}"]`);
    await expect(fixture.first()).toBeVisible();
    await expect(page.getByRole("group", { name: "Runtime Single Stack", exact: true })).toBeVisible();
    await expect(page.getByRole("group", { name: "Runtime Twin Rail", exact: true })).toBeVisible();
    await expect(page.locator(`[data-signature-family="${FAMILY_NEUTRAL_RUNTIME_FIXTURE_ID}"][data-signature-presentation-id="fixture-single-stack"]`).first()).toBeVisible();
    await expect(page.locator(`[data-signature-family="${FAMILY_NEUTRAL_RUNTIME_FIXTURE_ID}"][data-signature-presentation-id="fixture-twin-rail"]`).first()).toBeVisible();
    await expect(fixture.locator('.signature-master__semantic-icon[data-signature-icon="simple-icons:spotify"]').first()).toBeVisible();
    await expect(fixture.locator('.signature-master__semantic-icon svg').first()).toBeVisible();
    await expect(fixture.locator('[data-signature-material-id="smoked_glass"]').first()).toBeVisible();
    await expect(fixture.locator('[data-signature-material-id="brushed_gold"]').first()).toBeVisible();
    await expect(page.getByText("Secondary copy remains independently authored", { exact: true }).first()).toBeVisible();
    const editProof = await fixture.evaluateAll((elements) => elements.map((element) => ({
      asset: element.getAttribute("data-signature-asset-id"),
      presentation: element.getAttribute("data-signature-presentation-id"),
      material: element.querySelector("[data-signature-material-id]")?.getAttribute("data-signature-material-id") ?? element.getAttribute("data-signature-material-id"),
      icon: element.getAttribute("data-signature-icon"),
    })));

    await page.getByTestId("studio-preview").click();
    await expect(page.getByTestId("studio-editor-rail")).toHaveCount(0);
    await expect(page.locator(`[data-signature-family="${FAMILY_NEUTRAL_RUNTIME_FIXTURE_ID}"]`).first()).toBeVisible();
    const previewProof = await page.locator(`[data-signature-family="${FAMILY_NEUTRAL_RUNTIME_FIXTURE_ID}"]`).evaluateAll((elements) => elements.map((element) => ({
      asset: element.getAttribute("data-signature-asset-id"),
      presentation: element.getAttribute("data-signature-presentation-id"),
      material: element.querySelector("[data-signature-material-id]")?.getAttribute("data-signature-material-id") ?? element.getAttribute("data-signature-material-id"),
      icon: element.getAttribute("data-signature-icon"),
    })));
    expect(previewProof).toEqual(editProof);
    await page.screenshot({ path: "/private/tmp/curated-family-neutral-preview.png", fullPage: true });
    await page.getByTestId("studio-preview").click();

    await page.getByTestId("preview-live-device").click();
    const panel = page.getByTestId("live-device-qr-panel");
    await expect(panel).toHaveAttribute("data-preview-status", "ready", { timeout: 15_000 });
    const candidate = (await page.getByTestId("preview-url-text").getAttribute("href")) || "";
    expect(candidate).toContain("/preview/live/");
    const candidateUrl = new URL(candidate);
    const safeLoopbackUrl = `http://127.0.0.1:3050${candidateUrl.pathname}${candidateUrl.search}`;

    phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    expect(await phoneContext.cookies()).toEqual([]);
    const phone = await phoneContext.newPage();
    await phone.goto(safeLoopbackUrl, { waitUntil: "networkidle" });
    await expect(phone.getByTestId("preview-live-page")).toBeVisible();
    const phoneFixture = phone.locator(`[data-signature-family="${FAMILY_NEUTRAL_RUNTIME_FIXTURE_ID}"]`);
    await expect(phoneFixture.first()).toBeVisible();
    await expect(phoneFixture.locator('.signature-master__semantic-icon[data-signature-icon="simple-icons:spotify"]').first()).toBeVisible();
    await expect(phoneFixture.locator('[data-signature-material-id="smoked_glass"]').first()).toBeVisible();
    await expect(phoneFixture.locator('[data-signature-material-id="brushed_gold"]').first()).toBeVisible();
    await expect(phone.getByText("Secondary copy remains independently authored", { exact: true }).first()).toBeVisible();
    const cardBounds = await phone.getByTestId("preview-card-composition-host").boundingBox();
    expect(cardBounds?.width).toBeLessThanOrEqual(390);
    const overflow = await phoneFixture.evaluateAll((elements) => elements.some((element) => {
      const rect = element.getBoundingClientRect();
      const depth = element.querySelector<HTMLElement>(".signature-master__depth");
      const depthRect = depth?.getBoundingClientRect();
      return rect.left < -1 || rect.right > window.innerWidth + 1 || Boolean(depthRect && (depthRect.left < rect.left - 1 || depthRect.right > rect.right + 1));
    }));
    expect(overflow).toBe(false);
    await phone.screenshot({ path: "/private/tmp/curated-family-neutral-phone390.png", fullPage: true });
  } finally {
    await phoneContext?.close();
    const currentResponse = await page.request.get("/api/card/draft");
    if (currentResponse.ok()) {
      const current = await currentResponse.json() as { revision: number };
      const restore = await page.request.put("/api/card/draft", { data: { draft: baseline.draft, expectedRevision: current.revision } });
      expect(restore.ok()).toBeTruthy();
    }
  }
});
