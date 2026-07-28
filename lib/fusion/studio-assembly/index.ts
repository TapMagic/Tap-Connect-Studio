export type {
  StudioAssemblyMode,
  AssemblyPhase,
  AssemblyCapabilityId,
  AssemblyCapabilityDef,
  AssemblyFrameState,
  AssemblyCardSnapshot,
  StudioAssemblyEvent,
  StudioAssemblyMachineState,
} from "./types";

export {
  ASSEMBLY_CAPABILITIES,
  capabilitiesForMode,
  capabilityById,
  ASSEMBLY_DESTINATION_SELECTORS,
} from "./capabilities";

export {
  ASSEMBLY_STORYBOARD,
  TIMING_LANDING_FULL,
  TIMING_FIRST_ENTRY,
  TIMING_EVERYDAY,
  TIMING_REDUCED,
  timingForMode,
  phaseSequenceForMode,
  totalDurationMs,
  CAPABILITY_DEMO_BEATS,
} from "./timing";

export {
  createAssemblyMachine,
  nextPhase,
  reduceAssembly,
  isTerminalPhase,
  isAssemblyActive,
  modeUnfoldsToHome,
} from "./state-machine";

export {
  LANDING_REPLAY_KEY,
  STUDIO_FIRST_SEEN_KEY,
  STUDIO_SKIP_KEY,
  markStudioFirstEntrySeen,
  hasSeenStudioFirstEntry,
  markEverydaySkipPreferred,
  prefersSkipEveryday,
  resolveStudioEntryKind,
  entryKindToMode,
} from "./prefs";

export {
  trackAssemblyEvent,
  onAssemblyAnalytics,
  type StudioAssemblyAnalyticsEvent,
  type AssemblyAnalyticsPayload,
} from "./analytics";

export {
  ILLUSTRATIVE_FRAME,
  frameFromCardSnapshot,
  demoCardSnapshot,
} from "./frame";
