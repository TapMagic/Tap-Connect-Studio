import { CreativeCompositionCanvas } from "@/components/fusion/creative-studio/creative-composition-canvas";
import { renderDocumentToCompositionBlock } from "@/lib/fusion/creative-platform/composition-adapter";
import {
  creativeRenderDocumentSchema,
  type CreativeRenderDocument,
} from "@/lib/fusion/creative-platform/model";

export function CreativeDomRenderer({
  document,
  label = "Creative composition",
  forceMobileFallback = false,
  className,
}: {
  document: CreativeRenderDocument | unknown;
  label?: string;
  forceMobileFallback?: boolean;
  className?: string;
}) {
  const parsed = creativeRenderDocumentSchema.safeParse(document);
  if (!parsed.success) {
    return (
      <div
        role="status"
        className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/55"
        data-testid="creative-render-unavailable"
      >
        This creative section needs attention before it can be shown.
      </div>
    );
  }
  return (
    <CreativeCompositionCanvas
      block={renderDocumentToCompositionBlock(parsed.data, { label })}
      editMode={false}
      forceMobileFallback={forceMobileFallback}
      aspectRatio={parsed.data.canvas.aspectRatio}
      className={className}
    />
  );
}
