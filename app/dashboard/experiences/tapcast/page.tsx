import { TapCastHubShell } from "@/components/fusion/tapcast/tapcast-hub-shell";
import { requireBusiness } from "@/lib/auth";
import { DISPLAY_READINESS_LABEL } from "@/lib/fusion/readiness/display-status";
import {
  evaluateAllChannelReadiness,
  registrySnapshot,
} from "@/lib/fusion/tapcast/registry";
import {
  connectionsMap,
  hydrateChannelConnections,
  listVariantsFromDb,
  omnichannelPersistenceEnabled,
} from "@/lib/fusion/tapcast/omnichannel";

export const dynamic = "force-dynamic";

export default async function TapCastHubPage() {
  const { business } = await requireBusiness();
  await hydrateChannelConnections(business.id);
  const registry = registrySnapshot();
  const readiness = evaluateAllChannelReadiness(connectionsMap(business.id));
  const variants = await listVariantsFromDb(business.id);

  return (
    <TapCastHubShell
      initial={{
        channels: registry.channels,
        readiness,
        variants,
        statusLabel: DISPLAY_READINESS_LABEL.verified_credentials_required,
        persistence: omnichannelPersistenceEnabled() ? "prisma" : "memory",
      }}
    />
  );
}
