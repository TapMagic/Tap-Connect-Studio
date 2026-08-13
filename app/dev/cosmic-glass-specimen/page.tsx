import { notFound } from "next/navigation";
import { CosmicGlassSpecimenClient } from "./specimen-client";

export default async function CosmicGlassSpecimenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.TAPCONNECT_DEV_AUTH !== "1") notFound();
  const query = await searchParams;
  const value = (key: string) => typeof query[key] === "string" ? query[key] : undefined;
  return (
    <CosmicGlassSpecimenClient
      view={value("view") === "divider" || value("view") === "full" ? value("view") as "divider" | "full" : "hero"}
      ringFinish={value("finish") === "copper" ? "copper" : "gold"}
      ringShape={value("shape") === "soft_square" ? "soft_square" : "round"}
      dividerCenter={value("center") === "identity" || value("center") === "none" ? value("center") as "identity" | "none" : "diamond"}
      phone={value("phone") === "1"}
    />
  );
}
