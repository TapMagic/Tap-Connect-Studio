"use client";

import { Show } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HeroCtas() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Show when="signed-out">
        <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }), "px-6")}>
          Start building
          <ArrowRight className="size-4" />
        </Link>
      </Show>
      <Show when="signed-in">
        <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }), "px-6")}>
          Go to dashboard
          <ArrowRight className="size-4" />
        </Link>
      </Show>
      <Link
        href="#preview"
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-6")}
      >
        Explore the platform
      </Link>
    </div>
  );
}
