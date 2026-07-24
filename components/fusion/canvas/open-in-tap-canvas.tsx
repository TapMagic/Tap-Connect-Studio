import Link from "next/link";
import { getOpenInTapCanvasHref } from "@/lib/fusion/canvas";

/** Compact “Open in TapCanvas” affordance for key Studio surfaces */
export function OpenInTapCanvasLink({
  objectType,
  objectId,
  className,
}: {
  objectType: string;
  objectId: string;
  className?: string;
}) {
  const href = getOpenInTapCanvasHref({ objectType, objectId });
  return (
    <Link
      href={href}
      className={
        className ??
        "text-xs font-medium text-primary underline-offset-4 hover:underline"
      }
    >
      Open in TapCanvas
    </Link>
  );
}
