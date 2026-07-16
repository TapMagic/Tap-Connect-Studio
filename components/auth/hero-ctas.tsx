"use client";

import { Show } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HeroCtas() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <a href="#demo" className={cn(buttonVariants({ size: "lg" }), "px-6")}>
        Launch Live Demo
        <ArrowRight className="size-4" />
      </a>
      <a
        href="#features"
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "border-[rgba(214,168,79,0.35)] px-6 text-[var(--lp-ivory,#f8fafc)] hover:bg-[rgba(214,168,79,0.1)]"
        )}
      >
        Explore Features
      </a>
      <Show when="signed-out">
        <Link
          href="/sign-up"
          className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "px-6 text-slate-300")}
        >
          Get Started
        </Link>
      </Show>
      <Show when="signed-in">
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "px-6 text-slate-300")}
        >
          Go to dashboard
        </Link>
      </Show>
    </div>
  );
}
