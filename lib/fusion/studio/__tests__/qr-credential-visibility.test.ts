import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const panelSource = readFileSync("components/fusion/card/public-qr-credential-panel.tsx", "utf8");
const librarySource = readFileSync("components/fusion/card/experience-library.tsx", "utf8");
const studioSource = readFileSync("components/fusion/card/reconstitution/card-studio-reconstitution-workspace.tsx", "utf8");
const routeSource = readFileSync("app/api/experiences/[id]/credentials/route.ts", "utf8");

describe("public QR credential visibility", () => {
  it("keeps viewing/export on GET and reserves POST/DELETE for explicit management", () => {
    assert.match(panelSource, /fetch\(`\/api\/experiences\/\$\{experienceId\}\/credentials`, \{ cache: "no-store" \}\)/);
    assert.match(panelSource, /Show QR/);
    assert.match(panelSource, /Download/);
    assert.match(panelSource, /Copy link/);
    assert.match(panelSource, /Viewing, copying, and downloading are read-only/);
    assert.match(routeSource, /experienceCredentialAccessPath\(credential\)/);
    assert.doesNotMatch(routeSource.slice(routeSource.indexOf("export async function GET"), routeSource.indexOf("export async function POST")), /appendAuditEvent|\.create\(|\.update\(/);
  });

  it("uses one governed panel in Library and the canonical Studio cockpit", () => {
    assert.match(librarySource, /item\.qrStatus === "ACTIVE" \? "View QR" : "Generate QR"/);
    assert.match(librarySource, /<PublicQrCredentialPanel experienceId=\{item\.id\}/);
    assert.match(studioSource, /data-testid="studio-public-qr"/);
    assert.match(studioSource, /Temporary Draft/);
    assert.match(studioSource, /Permanent \/ published/);
    assert.match(studioSource, /<PublicQrCredentialPanel experienceId=/);
  });
});
