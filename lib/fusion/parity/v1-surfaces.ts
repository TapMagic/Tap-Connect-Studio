/**
 * V1 parity surface inventory — code-level checklist (not browser OWNER-READY).
 * Maps charter V1 floor routes that must remain reachable in fusion.
 */

export type V1ParityItem = {
  id: string;
  route: string;
  label: string;
  pillar: string;
};

export const V1_PARITY_SURFACES: V1ParityItem[] = [
  { id: "v1-builder", route: "/dashboard/builder", label: "Card Builder", pillar: "Experiences" },
  { id: "v1-campaigns", route: "/dashboard/campaigns", label: "Campaigns", pillar: "Experiences" },
  { id: "v1-groups", route: "/dashboard/groups", label: "Campaign Groups", pillar: "Experiences" },
  { id: "v1-scan", route: "/dashboard/scan", label: "Scan Mode", pillar: "Tap Points" },
  { id: "v1-devices", route: "/dashboard/devices", label: "Devices", pillar: "Tap Points" },
  { id: "v1-assets", route: "/dashboard/assets", label: "Assets / media", pillar: "Assets" },
  { id: "v1-leads", route: "/dashboard/leads", label: "Leads", pillar: "Audience" },
  { id: "v1-settings", route: "/dashboard/settings", label: "Settings", pillar: "Settings" },
  { id: "v1-public-tap", route: "/t/[deviceCode]", label: "Public tap resolver", pillar: "Public" },
];

export function assertV1ParityInventoryComplete(): { ok: true; count: number } {
  if (V1_PARITY_SURFACES.length < 8) {
    throw new Error("V1 parity inventory too thin");
  }
  const routes = new Set(V1_PARITY_SURFACES.map((s) => s.route));
  for (const required of [
    "/dashboard/builder",
    "/dashboard/campaigns",
    "/dashboard/scan",
    "/t/[deviceCode]",
  ]) {
    if (!routes.has(required)) throw new Error(`Missing V1 surface ${required}`);
  }
  return { ok: true, count: V1_PARITY_SURFACES.length };
}
