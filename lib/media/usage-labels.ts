import type { CreativeSurfaceKind } from "@prisma/client";

export function ownerMediaUsageLabel(
  surface: CreativeSurfaceKind,
  documentPath: string
): string {
  if (surface === "CARD") {
    return documentPath.includes(".composition.")
      ? "Card composition"
      : "Card creative";
  }
  if (surface === "EMAIL") return "Email hero";
  if (surface === "CAMPAIGN") return "Campaign creative";
  if (surface === "OFFER") return "Offer creative";
  if (surface === "SPOTLIGHT") return "Campaign spotlight";
  return "Coupon creative";
}
