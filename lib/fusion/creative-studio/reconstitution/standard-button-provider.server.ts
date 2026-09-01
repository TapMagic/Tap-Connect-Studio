import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { STANDARD_BUTTON_CATALOG, type StandardButtonPresetDefinition, type StandardButtonPresetId } from "./standard-button-catalog";
import type { StudioResourceProvider } from "@/lib/fusion/creative-studio/platform/resource-provider-registry.server";

const NAME_PREFIX = "TapConnect Standard · ";

function catalogResourceName(preset: StandardButtonPresetDefinition) {
  return `${NAME_PREFIX}${preset.name} · v${preset.version}`;
}

function catalogPayload(preset: StandardButtonPresetDefinition): Prisma.InputJsonValue {
  return {
    schemaVersion: 1,
    resourceKind: "BUTTON_STYLE",
    value: {
      fill: { kind: "solid", color: "#b8ff2c" },
      text: { fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontSizePx: Number(preset.props.fontSize ?? 16), fontWeight: Number(preset.props.fontWeight ?? 700), lineHeight: 1.2, letterSpacingEm: 0, color: "#07100a" },
      radiusPx: Number(preset.props.radius ?? 12),
      paddingX: Number(preset.props.padding ?? 18),
      paddingY: Math.max(6, Number(preset.props.padding ?? 12) * 0.65),
    },
    metadata: {
      description: preset.description,
      tags: [`standard-button:${preset.id}`, `catalog-version:${preset.version}`, ...preset.tags],
      studioResourceRef: { provider: "tapconnect-catalog", resourceId: `standard-button:${preset.id}`, version: preset.version },
      studioResourceKind: "button-presentation",
      demo: true,
    },
  } as Prisma.InputJsonValue;
}

export async function resolveStandardButtonCatalogResource(input: { businessId: string; userId: string; presetId: StandardButtonPresetId }) {
  const preset = STANDARD_BUTTON_CATALOG.find((candidate) => candidate.id === input.presetId);
  if (!preset) throw new Error("Unknown Standard Button preset");
  const name = catalogResourceName(preset);
  const activeNameKey = `${input.businessId}:BUTTON_STYLE:${name.toLocaleLowerCase("en-US")}`;
  const existing = await prisma.creativeResource.findUnique({ where: { activeNameKey }, include: { currentRevision: true } });
  if (existing?.currentRevision) return { resourceId: existing.id, revisionId: existing.currentRevision.id, kind: "button-presentation" };
  return prisma.$transaction(async (tx) => {
    const resource = await tx.creativeResource.create({ data: { businessId: input.businessId, kind: "BUTTON_STYLE", name, activeNameKey, status: "APPROVED", createdById: input.userId, updatedById: input.userId, approvedById: input.userId, approvedAt: new Date() } });
    const revision = await tx.creativeResourceRevision.create({ data: { resourceId: resource.id, version: 1, schemaVersion: 1, payload: catalogPayload(preset), createdById: input.userId } });
    await tx.creativeResource.update({ where: { id: resource.id }, data: { currentRevisionId: revision.id } });
    return { resourceId: resource.id, revisionId: revision.id, kind: "button-presentation" };
  }).catch(async (error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await prisma.creativeResource.findUnique({ where: { activeNameKey }, include: { currentRevision: true } });
      if (raced?.currentRevision) return { resourceId: raced.id, revisionId: raced.currentRevision.id, kind: "button-presentation" };
    }
    throw error;
  });
}

export function parseStandardButtonResourceId(resourceId: string): StandardButtonPresetId | null {
  if (!resourceId.startsWith("standard-button:")) return null;
  const id = resourceId.slice("standard-button:".length) as StandardButtonPresetId;
  return STANDARD_BUTTON_CATALOG.some((preset) => preset.id === id) ? id : null;
}

export const standardButtonResourceProvider: StudioResourceProvider = {
  provider: "tapconnect-catalog",
  async resolve(input) {
    const presetId = parseStandardButtonResourceId(input.resource.resourceId);
    if (!presetId) throw new Error(`Unknown TapConnect catalog resource: ${input.resource.resourceId}`);
    return resolveStandardButtonCatalogResource({ businessId: input.businessId, userId: input.userId, presetId });
  },
};
