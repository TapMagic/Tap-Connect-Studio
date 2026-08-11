import { notFound } from "next/navigation";
import { TopshelfSpecimenClient } from "./specimen-client";

/** Dev-only isolated Top Shelf Button specimen. Gated by TAPCONNECT_DEV_AUTH=1. */
export default async function TopshelfSpecimenPage({
  searchParams,
}: {
  searchParams: Promise<{
    anchor?: string;
    placement?: string;
    halo?: string;
  }>;
}) {
  if (process.env.TAPCONNECT_DEV_AUTH !== "1") notFound();
  const q = await searchParams;
  return (
    <TopshelfSpecimenClient
      anchor={q.anchor}
      placement={q.placement === "left" ? "left" : "right"}
      halo={q.halo != null ? Number(q.halo) : undefined}
    />
  );
}
