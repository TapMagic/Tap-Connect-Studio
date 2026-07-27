import { revokeDestination } from "./service";

export async function revokeDestinationViaStore(input: {
  businessId: string;
  destinationId: string;
}) {
  return revokeDestination(input);
}
