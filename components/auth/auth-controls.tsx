"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AuthControls({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Show when="signed-out">
        <Link href="/sign-in" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Sign in
        </Link>
        <Link href="/sign-up" className={buttonVariants({ size: "sm" })}>
          Sign up
        </Link>
      </Show>
      <Show when="signed-in">
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Dashboard
        </Link>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </Show>
    </div>
  );
}

/** Landing-page auth: shows Sign in/up OR Dashboard depending on session */
export function AuthLinks({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Show when="signed-out">
        <Link href="/sign-in" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Sign in
        </Link>
        <Link href="/sign-up" className={buttonVariants({ size: "sm" })}>
          Sign up
        </Link>
      </Show>
      <Show when="signed-in">
        <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
          Go to dashboard
        </Link>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </Show>
    </div>
  );
}
