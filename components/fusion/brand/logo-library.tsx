"use client";

/**
 * Logo tiles with contain + transparent / dark / light / compact plates.
 * Avoids destructive square cropping.
 */

import { cn } from "@/lib/utils";

export type LogoLibraryItem = {
  id: string;
  url: string;
  role: "primary" | "alternate" | "icon" | "other";
  format?: string;
  width?: number;
  height?: number;
  source?: string;
  approval: "suggested" | "approved" | "ignored" | "none";
};

export type LogoLibraryProps = {
  items: LogoLibraryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onApprove?: (id: string) => void;
  onIgnore?: (id: string) => void;
  onSetPrimary?: (id: string) => void;
  onReplace?: (id: string) => void;
};

export function LogoLibrary({
  items,
  selectedId,
  onSelect,
  onApprove,
  onIgnore,
  onSetPrimary,
  onReplace,
}: LogoLibraryProps) {
  if (!items.length) {
    return (
      <p className="text-sm text-white/55" data-testid="logo-library-empty">
        No logos yet — upload or approve a Discover suggestion.
      </p>
    );
  }

  return (
    <ul className="space-y-4" data-testid="logo-library">
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <li
            key={item.id}
            className={cn(
              "rounded-xl border p-3",
              selected ? "border-primary/50 bg-primary/5" : "border-white/10 bg-white/[0.02]"
            )}
            data-testid={`logo-tile-${item.id}`}
            data-approval={item.approval}
          >
            <button
              type="button"
              className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => onSelect(item.id)}
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <LogoPlate label="Transparent" variant="checker" url={item.url} />
                <LogoPlate label="Dark" variant="dark" url={item.url} />
                <LogoPlate label="Light" variant="light" url={item.url} />
                <LogoPlate label="Compact" variant="compact" url={item.url} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-white/55">
                <div>
                  <dt className="inline text-white/55">Role · </dt>
                  <dd className="inline capitalize text-white/80">{item.role}</dd>
                </div>
                <div>
                  <dt className="inline text-white/55">Format · </dt>
                  <dd className="inline text-white/80">{item.format || "image"}</dd>
                </div>
                <div>
                  <dt className="inline text-white/55">Size · </dt>
                  <dd className="inline text-white/80">
                    {item.width && item.height
                      ? `${item.width}×${item.height}`
                      : "Original"}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-white/55">Source · </dt>
                  <dd className="inline text-white/80">{item.source || "Library"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="inline text-white/55">Approval · </dt>
                  <dd className="inline capitalize text-white/80">{item.approval.replace("_", " ")}</dd>
                </div>
              </dl>
            </button>
            <div className="mt-3 flex flex-wrap gap-2">
              {onSetPrimary ? (
                <ActionBtn testId={`logo-primary-${item.id}`} onClick={() => onSetPrimary(item.id)}>
                  Choose primary
                </ActionBtn>
              ) : null}
              {onApprove ? (
                <ActionBtn
                  testId={`logo-approve-${item.id}`}
                  primary
                  onClick={() => onApprove(item.id)}
                >
                  Approve
                </ActionBtn>
              ) : null}
              {onReplace ? (
                <ActionBtn testId={`logo-replace-${item.id}`} onClick={() => onReplace(item.id)}>
                  Replace
                </ActionBtn>
              ) : null}
              {onIgnore ? (
                <ActionBtn testId={`logo-ignore-${item.id}`} onClick={() => onIgnore(item.id)}>
                  Ignore
                </ActionBtn>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function LogoPlate({
  label,
  variant,
  url,
}: {
  label: string;
  variant: "checker" | "dark" | "light" | "compact";
  url: string;
}) {
  return (
    <figure
      className="overflow-hidden rounded-lg border border-white/10"
      data-testid={`logo-plate-${variant}`}
    >
      <div
        className={cn(
          "flex items-center justify-center p-2",
          variant === "checker" && "bg-[length:12px_12px] bg-[linear-gradient(45deg,#333_25%,transparent_25%,transparent_75%,#333_75%,#333),linear-gradient(45deg,#333_25%,#222_25%,#222_75%,#333_75%,#333)] bg-[position:0_0,6px_6px]",
          variant === "dark" && "bg-[#0b0f19]",
          variant === "light" && "bg-[#f8fafc]",
          variant === "compact" && "bg-[#111827] min-h-[44px]",
          variant !== "compact" && "min-h-[72px]"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          className={cn(
            "object-contain",
            variant === "compact" ? "h-7 max-w-[96px]" : "h-12 max-w-full"
          )}
          data-object-fit="contain"
        />
      </div>
      <figcaption className="border-t border-white/8 px-1.5 py-1 text-center text-[9px] uppercase tracking-wider text-white/55">
        {label}
      </figcaption>
    </figure>
  );
}

function ActionBtn({
  children,
  onClick,
  primary,
  testId,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center rounded-md px-3 text-xs font-medium",
        primary
          ? "bg-primary text-primary-foreground"
          : "border border-white/15 text-white/80 hover:bg-white/5"
      )}
    >
      {children}
    </button>
  );
}
