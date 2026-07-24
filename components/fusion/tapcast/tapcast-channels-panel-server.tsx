import { TapCastChannelsPanel } from "@/components/fusion/tapcast/tapcast-channels-panel";
import { DISPLAY_READINESS_LABEL } from "@/lib/fusion/readiness/display-status";
import {
  evaluateAllChannelReadiness,
  registrySnapshot,
} from "@/lib/fusion/tapcast/registry";
import { connectionsMap } from "@/lib/fusion/tapcast/omnichannel";

/** Server wrapper so registry rows exist before client hydration */
export function TapCastChannelsPanelServer({ businessId }: { businessId?: string }) {
  const registry = registrySnapshot();
  const readiness = evaluateAllChannelReadiness(
    businessId ? connectionsMap(businessId) : new Map()
  );

  return (
    <TapCastChannelsPanel
      initial={{
        channels: registry.channels,
        readiness,
        statusLabel: DISPLAY_READINESS_LABEL.verified_credentials_required,
      }}
    />
  );
}
