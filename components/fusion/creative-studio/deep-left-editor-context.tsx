"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  INITIAL_DEEP_LEFT_SESSION,
  closeDeepLeftEdit,
  deepLeftGoBack,
  openDeepLeftEdit,
  type DeepLeftEditorSession,
  type DeepLeftNestedPage,
} from "@/lib/fusion/creative-studio/deep-left-editor";

type DeepLeftEditorApi = {
  session: DeepLeftEditorSession;
  openEdit: (input: {
    section: string;
    targetLabel: string;
    capabilityLabel: string;
    previousLibraryTool: string;
    selectionGeneration: number;
  }) => void;
  setNestedPage: (page: DeepLeftNestedPage) => void;
  goBack: () => void;
  closeEdit: () => void;
  /** Portal mount id for toolbar panel bodies. */
  portalId: string;
};

const DeepLeftEditorContext = createContext<DeepLeftEditorApi | null>(null);

export const DEEP_LEFT_EDIT_PORTAL_ID = "deep-left-edit-portal-root";

export function DeepLeftEditorProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DeepLeftEditorSession>(INITIAL_DEEP_LEFT_SESSION);
  const openEdit = useCallback((input: {
    section: string;
    targetLabel: string;
    capabilityLabel: string;
    previousLibraryTool: string;
    selectionGeneration: number;
  }) => {
    setSession((current) => openDeepLeftEdit(current, input));
  }, []);
  const setNestedPage = useCallback((page: DeepLeftNestedPage) => {
    setSession((current) => (current.mode === "edit" ? { ...current, nestedPage: page } : current));
  }, []);
  const goBack = useCallback(() => {
    setSession((current) => deepLeftGoBack(current));
  }, []);
  const closeEdit = useCallback(() => {
    setSession((current) => closeDeepLeftEdit(current));
  }, []);
  const value = useMemo(
    () => ({ session, openEdit, setNestedPage, goBack, closeEdit, portalId: DEEP_LEFT_EDIT_PORTAL_ID }),
    [session, openEdit, setNestedPage, goBack, closeEdit]
  );
  return <DeepLeftEditorContext.Provider value={value}>{children}</DeepLeftEditorContext.Provider>;
}

export function useDeepLeftEditor(): DeepLeftEditorApi {
  const value = useContext(DeepLeftEditorContext);
  if (!value) {
    throw new Error("useDeepLeftEditor requires DeepLeftEditorProvider");
  }
  return value;
}

export function useDeepLeftEditorOptional(): DeepLeftEditorApi | null {
  return useContext(DeepLeftEditorContext);
}
