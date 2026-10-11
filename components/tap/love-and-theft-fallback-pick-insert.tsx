import type { CSSProperties } from "react";
import type { LoveAndTheftPickInsertConstruction } from "@/lib/fusion/creative-studio/signature-assets/everencore-love-and-theft";
import { cn } from "@/lib/utils";

type LoveAndTheftFallbackPickInsertProps = {
  canonicalIconId: string;
  construction: LoveAndTheftPickInsertConstruction;
  iconSvg: string;
  renderMode: "fill" | "stroke" | "multicolor" | string;
  compact?: boolean;
  className?: string;
  iconScale?: number;
  iconOffsetY?: number;
};

const darkAgedFace: CSSProperties = {
  background:
    "radial-gradient(circle at 34% 24%,rgba(123,80,34,.92) 0%,rgba(66,37,16,.98) 36%,rgba(35,17,7,.99) 69%,#140804 100%)",
  boxShadow:
    "inset 0 3px 4px rgba(0,0,0,.94),inset 0 -2px 2px rgba(243,197,101,.24),inset 1px 0 1px rgba(235,177,76,.15),0 0 0 1px rgba(27,10,3,.96)",
};

const brassEdge: CSSProperties = {
  background:
    "linear-gradient(145deg,#f4d58a 0%,#8d501e 14%,#2b1206 31%,#d69b43 52%,#4c240c 72%,#edc675 90%,#5b2a0e 100%)",
  boxShadow:
    "0 -1px 1px rgba(255,226,157,.58),0 3px 4px rgba(0,0,0,.86),inset 0 1px 1px rgba(255,235,178,.58),inset 0 -2px 2px rgba(20,7,2,.9)",
};

function EngravedIcon({ canonicalIconId, iconSvg, renderMode, iconScale, iconOffsetY, className, restrained = false }: Pick<LoveAndTheftFallbackPickInsertProps, "canonicalIconId" | "iconSvg" | "renderMode" | "iconScale" | "iconOffsetY"> & { className: string; restrained?: boolean }) {
  return <span
    className={cn("absolute left-1/2 top-1/2 grid place-items-center [&_svg]:block [&_svg]:h-full [&_svg]:w-full [&_svg]:overflow-visible", className)}
    style={{
      color: restrained ? "#98652c" : "#b98239",
      transform: `translate(-50%,-50%) translateY(${iconOffsetY ?? 0}%) scale(${iconScale ?? 1})`,
      filter: restrained
        ? "drop-shadow(0 -.5px 0 rgba(235,190,103,.3)) drop-shadow(0 1px .75px rgba(10,3,1,.88))"
        : "drop-shadow(0 -1px 0 rgba(255,216,132,.48)) drop-shadow(0 2px 1px rgba(10,3,1,.96))",
    }}
    data-love-and-theft-engraved-icon="true"
    data-signature-icon={canonicalIconId}
    data-signature-icon-render-mode={renderMode === "multicolor" ? "mixed" : renderMode}
    aria-hidden
    dangerouslySetInnerHTML={{ __html: iconSvg }}
  />;
}

/** Family-approved fallback constructions, derived from certified pick masters. */
export function LoveAndTheftFallbackPickInsert({
  canonicalIconId,
  construction,
  iconSvg,
  renderMode,
  compact = false,
  className,
  iconScale,
  iconOffsetY,
}: LoveAndTheftFallbackPickInsertProps) {
  const shared = {
    canonicalIconId,
    iconSvg,
    renderMode,
    iconScale,
    iconOffsetY,
  };
  // More Music uses the blank master's existing recessed field. Do not stack
  // another panel, medallion, or chassis inside that manufactured face.
  if (construction === "secondary-insert" && canonicalIconId === "lucide:library-big") {
    return <span
      className={cn("absolute left-1/2 top-[40.5%] z-[2] block h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2", className)}
      data-love-and-theft-fallback-insert="true"
      data-family-insert-construction="secondary-insert"
      data-family-insert-presentation="integrated-master-recess"
      data-family-recess-authority="blank-master"
      aria-hidden
    >
      <EngravedIcon {...shared} className="h-full w-full" restrained />
    </span>;
  }
  if (construction === "direct-engrave") {
    return <span
      className={cn("absolute left-1/2 top-[41%] z-[2] block h-[39%] w-[39%] -translate-x-1/2 -translate-y-1/2", className)}
      data-love-and-theft-fallback-insert="true"
      data-family-insert-construction="direct-engrave"
      aria-hidden
    >
      <EngravedIcon {...shared} className="h-full w-full" />
    </span>;
  }
  const medallion = construction === "recessed-medallion";
  return <span
    className={cn("absolute left-1/2 top-[40.5%] z-[2] block -translate-x-1/2 -translate-y-1/2", medallion ? "aspect-square rounded-full" : "h-[43%] rounded-[22%]", className)}
    style={{ ...brassEdge, width: medallion ? compact ? "49%" : "51%" : compact ? "55%" : "57%" }}
    data-love-and-theft-fallback-insert="true"
    data-family-insert-construction={construction}
    aria-hidden
  >
    <span className={cn("absolute", medallion ? "inset-[6%] rounded-full" : "inset-[7%] rounded-[18%]")} style={darkAgedFace} data-love-and-theft-fallback-recess-layer="true">
      <EngravedIcon {...shared} className={medallion ? "h-[54%] w-[54%]" : "h-[58%] w-[58%]"} />
    </span>
  </span>;
}
