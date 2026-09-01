"use client";

import { useMemo, useState } from "react";
import { validateStudioAuthoringCommand, type StudioAuthoringCommand } from "@/lib/fusion/creative-studio/platform/authoring-contract";
import type { StudioCuratedAssemblyMutation, StudioStructuredAssemblyDescriptor } from "@/lib/fusion/creative-studio/platform/structured-assembly";
import type { StudioTransientTaskLifecycle } from "@/lib/fusion/creative-studio/platform/adaptive-workspace";
import {
  createCuratedAuthoringCapability,
  curatedAuthoringSelection,
  curatedCommandPayloadToMutation,
} from "@/lib/fusion/creative-studio/reconstitution/curated-authoring-adapter";
import { StudioAuthoringShell } from "./studio-authoring-shell";

/**
 * Compatibility adapter for the original Curated inspector entry point.
 * The selected family supplies capabilities; StudioAuthoringShell supplies the
 * shared interaction grammar. No family presentation logic lives here.
 */
export function StudioAssemblyInspector({ assembly, selectedNodeId, onCommand, onPreviewCommand, onBeginLiveAdjustment, onCommitLiveAdjustment, onCancelLiveAdjustment, onMutate, onClose, transientTaskLifecycle, mediaUploadReady = false, stockReady = false }: {
  assembly: StudioStructuredAssemblyDescriptor;
  selectedNodeId: string;
  onCommand?: (command: StudioAuthoringCommand, mutation: StudioCuratedAssemblyMutation) => void;
  onPreviewCommand?: (command: StudioAuthoringCommand, mutation: StudioCuratedAssemblyMutation) => void;
  onBeginLiveAdjustment?: () => void;
  onCommitLiveAdjustment?: (label: string) => void;
  onCancelLiveAdjustment?: () => void;
  /** @deprecated Migration bridge retained until the shared command path is verified. */
  onMutate?: (mutation: StudioCuratedAssemblyMutation, label: string) => void;
  onClose: () => void;
  transientTaskLifecycle?: StudioTransientTaskLifecycle;
  mediaUploadReady?: boolean;
  stockReady?: boolean;
}) {
  const [activeId, setActiveId] = useState<string | undefined>();
  const resolvedActiveId = activeId && assembly.slots.some((slot) => slot.id === activeId) ? activeId : undefined;
  const capability = useMemo(() => createCuratedAuthoringCapability(assembly, resolvedActiveId), [resolvedActiveId, assembly]);
  const selection = useMemo(() => curatedAuthoringSelection(assembly, selectedNodeId, resolvedActiveId), [resolvedActiveId, assembly, selectedNodeId]);
  const dispatch = (command: StudioAuthoringCommand) => {
    const validation = validateStudioAuthoringCommand(capability, command);
    if (!validation.ok) return;
    const input = curatedCommandPayloadToMutation(command.commandId, command.payload, assembly);
    if (!input) return;
    const mutation = { ...input, commandId: command.commandId, provenance: command.provenance } as StudioCuratedAssemblyMutation;
    if (onCommand) onCommand(command, mutation);
    else onMutate?.(mutation, command.historyLabel);
  };
  const preview = (command: StudioAuthoringCommand) => {
    const validation = validateStudioAuthoringCommand(capability, command);
    if (!validation.ok) return;
    const input = curatedCommandPayloadToMutation(command.commandId, command.payload, assembly);
    if (!input) return;
    const mutation = { ...input, commandId: command.commandId, provenance: command.provenance } as StudioCuratedAssemblyMutation;
    onPreviewCommand?.(command, mutation);
  };
  return <StudioAuthoringShell
    capability={capability}
    selection={selection}
    onCommand={dispatch}
    onPreviewCommand={onPreviewCommand ? preview : undefined}
    onBeginLiveAdjustment={onBeginLiveAdjustment}
    onCommitLiveAdjustment={onCommitLiveAdjustment}
    onCancelLiveAdjustment={onCancelLiveAdjustment}
    onSelectInternal={setActiveId}
    onSelectModule={() => setActiveId(undefined)}
    onClose={onClose}
    transientTaskLifecycle={transientTaskLifecycle}
    mediaUploadReady={mediaUploadReady}
    stockReady={stockReady}
  />;
}
