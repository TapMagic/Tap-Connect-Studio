import "server-only";

import type { StudioResourceReference } from "./discovery";

export type StudioResourceProvider = {
  provider: string;
  resolve: (input: { businessId: string; userId: string; resource: StudioResourceReference }) => Promise<{ resourceId: string; kind: string }>;
};

export async function resolveStudioResourceReference(input: {
  businessId: string;
  userId: string;
  resource: StudioResourceReference;
  providers: readonly StudioResourceProvider[];
}) {
  if (input.resource.provider === "creative-resource") {
    return { resourceId: input.resource.resourceId, kind: "creative-resource" };
  }
  const provider = input.providers.find((candidate) => candidate.provider === input.resource.provider);
  if (provider) return provider.resolve(input);
  throw new Error(`No Studio resource provider can resolve ${input.resource.provider}:${input.resource.resourceId}`);
}
