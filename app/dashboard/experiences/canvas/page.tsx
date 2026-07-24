import { TapCanvasShell } from "@/components/fusion/canvas/tap-canvas-shell";
import { requireBusiness } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TapCanvasPage({
  searchParams,
}: {
  searchParams: Promise<{ linkType?: string; linkId?: string; canvasId?: string }>;
}) {
  await requireBusiness();
  const sp = await searchParams;

  return (
    <div className="p-5 lg:p-8">
      <TapCanvasShell initialLinkType={sp.linkType} initialLinkId={sp.linkId} />
    </div>
  );
}
