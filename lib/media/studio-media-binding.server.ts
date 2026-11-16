import { prisma } from "@/lib/db";
import {
  collectStudioMediaBindings,
  validateStudioMediaBindings,
} from "./studio-media-binding";
export async function assertStudioMediaBindings(
  document: unknown,
  businessId: string,
  client: Pick<typeof prisma, "mediaAsset"> = prisma,
) {
  const bindings = collectStudioMediaBindings(document);
  if (!bindings.length) return;
  const assets = await client.mediaAsset.findMany({
    where: {
      businessId,
      id: { in: [...new Set(bindings.map((binding) => binding.id))] },
    },
    select: { id: true, url: true, mimeType: true, approvalStatus: true },
  });
  validateStudioMediaBindings(bindings, assets);
}
