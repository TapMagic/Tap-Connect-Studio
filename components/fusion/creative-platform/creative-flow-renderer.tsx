import {
  creativeFlowSectionSchema,
  type CreativeFlowSection,
} from "@/lib/fusion/creative-platform/model";
import {
  creativeFillToStyle,
  imageTreatmentToStyle,
} from "@/lib/fusion/creative-platform/render";

export function CreativeFlowRenderer({
  section,
  className = "",
}: {
  section: CreativeFlowSection | unknown;
  className?: string;
}) {
  const parsed = creativeFlowSectionSchema.safeParse(section);
  if (!parsed.success) {
    return (
      <div role="status" className="p-4 text-sm opacity-60">
        Complete this image and text section to preview it.
      </div>
    );
  }
  const value = parsed.data;
  const horizontal =
    value.layout === "image_left" ||
    value.layout === "image_right" ||
    value.layout === "square_wrap";
  const imageFirst =
    value.layout === "image_left" ||
    value.layout === "image_top" ||
    value.layout === "square_wrap";
  const text = (
    <div
      className={`min-w-0 ${
        value.alignment === "center"
          ? "self-center"
          : value.alignment === "end"
            ? "self-end"
            : "self-start"
      }`}
      data-flow-part="text"
    >
      {value.eyebrow ? (
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] opacity-65">
          {value.eyebrow}
        </p>
      ) : null}
      <h2 className="text-balance text-2xl font-bold">{value.heading}</h2>
      <p className="mt-2 whitespace-pre-wrap leading-relaxed opacity-80">{value.body}</p>
    </div>
  );
  const image = (
    <div
      className="relative min-h-40 overflow-hidden rounded-xl"
      style={
        horizontal
          ? { width: `${value.imageWidthPercent}%`, flex: "0 0 auto" }
          : undefined
      }
      data-flow-part="image"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={value.image.fallbackUrl}
        alt={value.imageTreatment.decorative ? "" : value.imageTreatment.altText}
        className="absolute inset-0 h-full w-full"
        style={imageTreatmentToStyle(value.imageTreatment)}
      />
    </div>
  );
  const ordered = imageFirst ? [image, text] : [text, image];
  const reverseMobile =
    (value.mobileStack === "text_first" && imageFirst) ||
    (value.mobileStack === "image_first" && !imageFirst);
  return (
    <section
      className={`creative-flow-section overflow-hidden rounded-2xl p-5 ${className}`}
      style={creativeFillToStyle(value.background)}
      data-testid="creative-flow-renderer"
      data-layout={value.layout}
      data-mobile-stack={value.mobileStack}
    >
      <div
        className={`flex ${
          horizontal
            ? reverseMobile
              ? "flex-col-reverse sm:flex-row"
              : "flex-col sm:flex-row"
            : "flex-col"
        }`}
        style={{ gap: value.gutterPx }}
      >
        {ordered}
      </div>
    </section>
  );
}
