"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark, shadcn } from "@clerk/ui/themes";
import { createContext, useContext, type ReactNode } from "react";

const AuthRuntimeContext = createContext<boolean | null>(null);

export function AuthRuntimeProvider({
  clerkEnabled,
  children,
}: {
  clerkEnabled: boolean;
  children: ReactNode;
}) {
  if (!clerkEnabled) {
    return <AuthRuntimeContext.Provider value={false}>{children}</AuthRuntimeContext.Provider>;
  }

  return (
    <ClerkProvider appearance={{ theme: [shadcn, dark] }}>
      <AuthRuntimeContext.Provider value>{children}</AuthRuntimeContext.Provider>
    </ClerkProvider>
  );
}

/**
 * The root layout owns the Clerk-versus-local decision. Client components must
 * consume that decision instead of independently inferring it from public env.
 */
export function useClerkRuntimeEnabled(): boolean {
  const enabled = useContext(AuthRuntimeContext);
  if (enabled === null) {
    throw new Error("Clerk-dependent UI must render within AuthRuntimeProvider.");
  }
  return enabled;
}
