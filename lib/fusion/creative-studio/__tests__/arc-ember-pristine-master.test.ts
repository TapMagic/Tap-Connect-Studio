import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  ARC_EMBER_PRISTINE_MASTER_ASSET,
  ARC_EMBER_PRISTINE_MASTER_PART_ID,
  ARC_EMBER_PRISTINE_MASTER_SHA256,
  ARC_EMBER_ROLE_PRESETS,
  applyArcEmberRolePreset,
  arcEmberPristineMasterInsertProps,
  applyVisualPart,
  getProvenanceForPart,
  getVisualPart,
  isArcEmberPristineMasterProps,
  readArcEmberActionCue,
  readArcEmberRole,
  readVisualPartsState,
  writeArcEmberActionCue,
} from "../visual-parts";

describe("Arc Ember pristine-master hosting test", () => {
  it("registers one candidate action-surface component, not a family", () => {
    const part = getVisualPart(ARC_EMBER_PRISTINE_MASTER_PART_ID);
    assert.ok(part);
    assert.equal(part.category, "action_surface");
    assert.equal(part.payload.kind, "action_surface");
    assert.equal(part.lifecycleStatus, "candidate");
    assert.notEqual(part.renderKind, "curated_family");
    assert.ok(part.supportedTargetFamilies.includes("button"));
    assert.equal(getProvenanceForPart(part.id)?.sourceType, "host_upload");
  });

  it("hosts the supplied PNG byte-for-byte without transformation", () => {
    const file = path.join(process.cwd(), "public", ARC_EMBER_PRISTINE_MASTER_ASSET.slice(1));
    const digest = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    assert.equal(digest, ARC_EMBER_PRISTINE_MASTER_SHA256);
  });

  it("applies only visual hosting state and preserves live content and Action", () => {
    const before = {
      label: "Open the Ember Vault",
      eyebrow: "PRIVATE ACCESS",
      description: "Members enter here",
      iconMediaUrl: "/tap-connect-logo.png",
      actionType: "website",
      href: "https://example.com/ember-vault",
      accessibleLabel: "Open the Ember Vault",
    };
    const result = applyVisualPart(before, ARC_EMBER_PRISTINE_MASTER_PART_ID, { targetFamily: "button" });
    assert.equal(result.ok, true);
    for (const [key, value] of Object.entries(before)) assert.equal(result.props[key], value, key);
    assert.equal(readVisualPartsState(result.props).actionSurfacePartId, ARC_EMBER_PRISTINE_MASTER_PART_ID);
    assert.equal(isArcEmberPristineMasterProps(result.props), true);
    assert.equal(readArcEmberActionCue(result.props), "arrow");
    const changed = writeArcEmberActionCue(result.props, "launch");
    assert.equal(readArcEmberActionCue(changed), "launch");
    assert.equal(changed["href"], before.href);
  });

  it("uses proportional contain geometry with overflow preserved", () => {
    const css = fs.readFileSync(
      path.join(process.cwd(), "lib/fusion/creative-studio/visual-parts/packages/arc-ember-pristine/arc-ember-pristine.css"),
      "utf8"
    );
    assert.match(css, /width:min\(100cqw,300cqh\)/);
    assert.match(css, /aspect-ratio:3 \/ 1/);
    assert.match(css, /\.ae-master-asset[^}]*object-fit:contain/);
    assert.match(css, /\.ae-master-host[^}]*overflow:visible/);
    assert.match(css, /\.ae-master-host:hover \.ae-master-stage/);
    assert.match(css, /\.ae-master-host:active \.ae-master-stage/);
    assert.match(css, /data-ae-state="disabled"/);
  });

  it("provides a drag/drop insert payload with ratio lock and the same hosting part", () => {
    const props = arcEmberPristineMasterInsertProps();
    assert.equal(props.aspectLocked, true);
    assert.equal(isArcEmberPristineMasterProps(props), true);
    assert.equal(props.actionType, "website");
  });

  it("offers four editable role presets from one immutable master", () => {
    assert.deepEqual(ARC_EMBER_ROLE_PRESETS.map((preset) => preset.id), [
      "primary",
      "social",
      "utility",
      "informational",
    ]);
    for (const preset of ARC_EMBER_ROLE_PRESETS) {
      const props = arcEmberPristineMasterInsertProps(preset.id);
      assert.equal(readArcEmberRole(props), preset.id);
      assert.equal(props.label, preset.title);
      assert.equal(props.description, preset.description);
      assert.equal(isArcEmberPristineMasterProps(props), true);
    }

    const customized = applyArcEmberRolePreset(
      { ...arcEmberPristineMasterInsertProps(), href: "https://example.com" },
      "social",
    );
    assert.equal(customized.href, "https://example.com");
    assert.equal(readArcEmberRole(customized), "social");
  });
});
