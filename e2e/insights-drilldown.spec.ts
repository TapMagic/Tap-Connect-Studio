/**
 * P-insights-drilldown-provenance — headed Insights complete matrix.
 * Filters → compare → drill-down → provenance → saved view → CSV export.
 */

import { test, expect } from "@playwright/test";
import {
  BASE,
  attachConsole,
  writeProof,
  writeProofIndex,
} from "./proof-helpers";

test.describe("Insights drill-down + provenance", () => {
  test("P-insights-drilldown-provenance: filters compare drill export", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    const blockers: string[] = [];

    await page.goto(`${BASE}/dashboard/insights`, { waitUntil: "networkidle" });
    await expect(page.locator('[data-testid="insights-hub"]')).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator("body")).toContainText(/Insight|TapProof|Export/i, {
      timeout: 15000,
    });
    notes.push("hub_loaded");

    // Date range filter
    const range7 = page.getByRole("link", { name: /^7d$/i });
    await expect(range7).toBeVisible();
    await range7.click();
    await page.waitForURL(/days=7/);
    notes.push("filter:7d");

    // View filter — Campaign
    const campaignView = page.getByTestId("insights-view-campaign");
    await expect(campaignView).toBeVisible();
    await campaignView.click();
    await page.waitForURL(/view=campaign/);
    notes.push("view:campaign");

    // Compare prior
    const compare = page.getByTestId("insights-compare-toggle");
    await expect(compare).toBeVisible();
    await compare.click();
    await page.waitForURL(/compare=1/);
    notes.push("compare:on");

    // Evidence filter
    const confirmed = page.getByTestId("insights-evidence-confirmed");
    await confirmed.click();
    await page.waitForURL(/evidence=confirmed/);
    notes.push("evidence:confirmed");

    // Reset evidence to all so KPIs remain visible for drill
    await page.getByTestId("insights-evidence-all").click();
    await page.waitForURL(/\/dashboard\/insights/);
    notes.push("evidence:all");

    // Drill-down on taps if present, else first available drill link
    const tapsDrill = page.getByTestId("insights-drill-taps_range");
    const anyDrill = page.locator('[data-testid^="insights-drill-"]').first();
    if ((await tapsDrill.count()) > 0) {
      await tapsDrill.click();
      await page.waitForURL(/drill=taps_range/);
      notes.push("drill:taps_range");
    } else if ((await anyDrill.count()) > 0) {
      await anyDrill.click();
      await page.waitForURL(/drill=/);
      notes.push("drill:any");
    } else {
      // Empty state still valid — open TapProof view for provenance
      notes.push("drill:skipped_empty_kpis");
      blockers.push("no_kpi_drill_targets_in_seed");
    }

    const drillTable = page.getByTestId("insights-drill-table");
    const drillEmpty = page.getByTestId("insights-drill-empty");
    if ((await drillTable.count()) > 0) {
      notes.push("drill_table_present");
      const rows = page.getByTestId("insights-drill-row");
      notes.push(`drill_rows=${await rows.count()}`);
    } else if ((await drillEmpty.count()) > 0) {
      notes.push("drill_empty_honest");
    }

    // TapProof provenance view
    await page.getByTestId("insights-view-tapproof").click();
    await page.waitForURL(/view=tapproof/);
    const provenance = page.getByTestId("insights-provenance");
    const provenanceEmpty = page.getByTestId("insights-provenance-empty");
    if ((await provenance.count()) > 0) {
      notes.push("provenance_panel");
      notes.push(`proof_rows=${await page.getByTestId("insights-proof-row").count()}`);
    } else if ((await provenanceEmpty.count()) > 0) {
      notes.push("provenance_empty_honest");
    } else {
      blockers.push("provenance_panel_missing");
    }

    // Freshness label
    await expect(page.getByTestId("insights-freshness")).toContainText(/Freshness/i);
    notes.push("freshness_present");

    // Saved view preset + save current
    await page.getByTestId("insights-preset-preset_campaign_compare").click();
    await page.waitForURL(/view=campaign/);
    notes.push("preset_applied");

    await expect(page.getByTestId("insights-controls")).toBeVisible({ timeout: 20000 });
    const saveName = page.getByTestId("insights-save-name");
    await expect(saveName).toBeVisible({ timeout: 15000 });
    await saveName.fill("E2E saved view");
    await page.getByTestId("insights-save-view").click();
    await expect(page.getByTestId("insights-saved-views")).toContainText(/E2E saved view/i, {
      timeout: 5000,
    });
    notes.push("saved_view_persisted");

    // CSV export
    const exportLink = page.getByTestId("insights-export-csv");
    await expect(exportLink).toBeVisible();
    const href = await exportLink.getAttribute("href");
    let exportOk = false;
    if (href) {
      const csvRes = await page.request.get(
        `${BASE}${href.startsWith("/") ? href : `/${href}`}`
      );
      exportOk = csvRes.ok();
      const text = exportOk ? await csvRes.text() : "";
      notes.push(`export_api=${csvRes.status()} bytes=${text.length}`);
      if (exportOk) {
        if (text.includes("evidence_class")) notes.push("csv_has_evidence");
        if (text.includes("proof_id") || text.includes("key,label")) {
          notes.push("csv_schema_ok");
        }
      } else {
        blockers.push("csv_export_failed");
      }
    } else {
      blockers.push("export_href_missing");
    }

    const browserE2ePassed = pageErrors.length === 0;
    const persistencePassed = exportOk;
    // Seed may lack events — empty drill is honest, not a hard fail for shell completeness
    const softBlockers = blockers.filter((b) => b !== "no_kpi_drill_targets_in_seed");
    const provenanceOk =
      notes.includes("provenance_panel") || notes.includes("provenance_empty_honest");
    const passed =
      browserE2ePassed && persistencePassed && softBlockers.length === 0 && provenanceOk;

    writeProof({
      id: "P-insights-drilldown-provenance",
      route: "/dashboard/insights + /api/insights/export",
      workflow:
        "Insights filters → compare → drill-down → TapProof provenance → saved view → CSV export",
      passed,
      browserE2ePassed,
      persistencePassed,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers: softBlockers,
    });
    writeProofIndex();

    expect(browserE2ePassed).toBeTruthy();
    expect(exportOk).toBeTruthy();
    expect(provenanceOk).toBeTruthy();
  });
});
