import type { SVGProps, ReactNode } from "react";
import type { TapConnectIconId } from "@/lib/fusion/icons/registry";
import { cn } from "@/lib/utils";

type IconProps = SVGProps<SVGSVGElement> & {
  title?: string;
  decorative?: boolean;
};

const strokeProps = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Base({
  title,
  decorative,
  children,
  className,
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      className={cn("shrink-0", className)}
      aria-hidden={decorative || !title ? true : undefined}
      role={title && !decorative ? "img" : undefined}
      {...rest}
    >
      {title && !decorative ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function IconCard(props: IconProps) {
  return (
    <Base title={props.title ?? "Card"} {...props}>
      <rect x="6" y="3.5" width="12" height="17" rx="2.25" {...strokeProps} />
      <circle cx="12" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
      <path d="M12 14.2v1.2" {...strokeProps} />
      <path d="M9.2 11.2a3.2 3.2 0 0 1 5.6 0" {...strokeProps} opacity={0.85} />
      <path d="M7.6 9.4a5.2 5.2 0 0 1 8.8 0" {...strokeProps} opacity={0.55} />
    </Base>
  );
}

export function IconBrand(props: IconProps) {
  return (
    <Base title={props.title ?? "Brand Kit"} {...props}>
      <rect x="4.5" y="5" width="9" height="12" rx="1.75" {...strokeProps} />
      <rect x="10.5" y="7.5" width="9" height="12" rx="1.75" {...strokeProps} />
      <circle cx="9" cy="10" r="1.25" fill="currentColor" stroke="none" />
      <path d="M13.8 12.2h3.2M13.8 14.6h2.4" {...strokeProps} />
    </Base>
  );
}

export function IconAssets(props: IconProps) {
  return (
    <Base title={props.title ?? "Assets"} {...props}>
      <rect x="4.2" y="5.5" width="6.8" height="9.5" rx="1.2" {...strokeProps} />
      <rect x="13" y="5.5" width="6.8" height="9.5" rx="1.2" {...strokeProps} />
      <path d="M6.2 18.8h11.6" {...strokeProps} />
      <path d="M6 8.4h3M6 10.8h3.6" {...strokeProps} />
      <path d="M14.8 8.4h3M14.8 10.8h3.6" {...strokeProps} />
      <circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" opacity={0.85} />
    </Base>
  );
}

export function IconTapPoints(props: IconProps) {
  return (
    <Base title={props.title ?? "Tap Points"} {...props}>
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M12 5.5v2.2M12 16.3v2.2M5.5 12h2.2M16.3 12h2.2" {...strokeProps} />
      <path d="M7.4 7.4l1.5 1.5M15.1 15.1l1.5 1.5M15.1 7.4l-1.5 1.5M8.9 15.1l-1.5 1.5" {...strokeProps} opacity={0.7} />
      <circle cx="12" cy="12" r="6.2" {...strokeProps} opacity={0.45} />
    </Base>
  );
}

export function IconCampaigns(props: IconProps) {
  return (
    <Base title={props.title ?? "Campaigns"} {...props}>
      <path d="M5 18.5 12 4.5l7 14" {...strokeProps} />
      <path d="M8.2 18.5h7.6" {...strokeProps} />
      <circle cx="12" cy="11.2" r="1.35" fill="currentColor" stroke="none" />
      <path d="M12 12.6v3.2" {...strokeProps} />
    </Base>
  );
}

export function IconTapSave(props: IconProps) {
  return (
    <Base title={props.title ?? "TapSave"} {...props}>
      <path
        d="M7 4.5h8.5a1.7 1.7 0 0 1 1.7 1.7V19l-5.95-3.3L5.3 19V6.2A1.7 1.7 0 0 1 7 4.5Z"
        {...strokeProps}
      />
      <path d="M9 8.2h6" {...strokeProps} />
    </Base>
  );
}

export function IconAudience(props: IconProps) {
  return (
    <Base title={props.title ?? "Audience & Relationships"} {...props}>
      <circle cx="9" cy="9" r="2.1" {...strokeProps} />
      <circle cx="16" cy="10.2" r="1.6" {...strokeProps} />
      <path d="M4.8 17.5c.4-2.4 2.2-3.7 4.2-3.7s3.8 1.3 4.2 3.7" {...strokeProps} />
      <path d="M13.2 17.5c.25-1.6 1.3-2.5 2.8-2.5 1.4 0 2.4.8 2.7 2.2" {...strokeProps} />
      <path d="M11.4 8.2c.5-.9 1.4-1.4 2.4-1.4" {...strokeProps} opacity={0.65} />
    </Base>
  );
}

export function IconEmail(props: IconProps) {
  return (
    <Base title={props.title ?? "Email & Communications"} {...props}>
      <rect x="3.5" y="6.5" width="12.5" height="9.5" rx="1.6" {...strokeProps} />
      <path d="M3.8 7.2 9.7 11.4 15.7 7.2" {...strokeProps} />
      <path d="M16.5 10.5h3.2l-2.1 2.4 2.1 2.4H16.5" {...strokeProps} />
    </Base>
  );
}

export function IconService(props: IconProps) {
  return (
    <Base title={props.title ?? "TapInbox / Service"} {...props}>
      <rect x="4" y="5" width="16" height="12.5" rx="2" {...strokeProps} />
      <path d="M8 9.2h8M8 12.2h5.5" {...strokeProps} />
      <path d="M9.5 17.5 12 20l2.5-2.5" {...strokeProps} />
      <circle cx="17.2" cy="8.2" r="1.1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconAutopilot(props: IconProps) {
  return (
    <Base title={props.title ?? "Autopilot"} {...props}>
      <path d="M5 16.5c2.2-4.5 4-6.8 7-6.8" {...strokeProps} opacity={0.55} />
      <path d="M6.5 18c3-3.8 5.2-5.2 8-5.2" {...strokeProps} opacity={0.75} />
      <path d="M5.5 8.5c4.5 0 7.2 2.2 9.5 7" {...strokeProps} />
      <path d="M15 15.5h3.8v-3.2" {...strokeProps} />
      <circle cx="8.2" cy="8.5" r="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconInsights(props: IconProps) {
  return (
    <Base title={props.title ?? "Insights & TapProof"} {...props}>
      <path d="M5 16.5 9.2 11.8 12.1 14.2 19 6.5" {...strokeProps} />
      <path d="M15.2 6.5H19v3.8" {...strokeProps} />
      <circle cx="9.2" cy="11.8" r="1" fill="currentColor" stroke="none" />
      <circle cx="12.1" cy="14.2" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconIntegrations(props: IconProps) {
  return (
    <Base title={props.title ?? "Integrations"} {...props}>
      <rect x="3.5" y="8" width="7" height="8" rx="1.6" {...strokeProps} />
      <rect x="13.5" y="8" width="7" height="8" rx="1.6" {...strokeProps} />
      <path d="M10.5 12h3" {...strokeProps} />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconTrustFabric(props: IconProps) {
  return (
    <Base title={props.title ?? "Trust Fabric"} {...props}>
      <path
        d="M12 3.8 18.5 6.2v4.8c0 4.2-2.7 7.2-6.5 8.7-3.8-1.5-6.5-4.5-6.5-8.7V6.2L12 3.8Z"
        {...strokeProps}
      />
      <path d="M8.2 11.2h7.6M8.2 13.6h7.6M10.4 9h3.2v7.2" {...strokeProps} opacity={0.75} />
    </Base>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <Base title={props.title ?? "Settings"} {...props}>
      <circle cx="12" cy="12" r="3" {...strokeProps} />
      <path
        d="M12 4.2v1.6M12 18.2v1.6M4.2 12h1.6M18.2 12h1.6M6.4 6.4l1.1 1.1M16.5 16.5l1.1 1.1M16.5 6.4l-1.1 1.1M7.5 16.5l-1.1 1.1"
        {...strokeProps}
      />
    </Base>
  );
}

export function IconCreate(props: IconProps) {
  return (
    <Base title={props.title ?? "Create"} {...props}>
      <circle cx="12" cy="12" r="8" {...strokeProps} />
      <path d="M12 8v8M8 12h8" {...strokeProps} />
    </Base>
  );
}

export function IconHome(props: IconProps) {
  return (
    <Base title={props.title ?? "Home"} {...props}>
      <path d="M4.5 11.2 12 4.8l7.5 6.4" {...strokeProps} />
      <path d="M7 10.5V18.5h10V10.5" {...strokeProps} />
      <rect x="10" y="13.2" width="4" height="5.3" rx="0.7" {...strokeProps} />
    </Base>
  );
}

export function IconTapProof(props: IconProps) {
  return (
    <Base title={props.title ?? "TapProof"} {...props}>
      {/* Evidence points resolving into a confirmed seal */}
      <circle cx="12" cy="12" r="6.4" {...strokeProps} />
      <path d="M9.2 12.2 11.2 14.2 15 9.8" {...strokeProps} />
      <circle cx="12" cy="3.6" r="0.85" fill="currentColor" stroke="none" opacity={0.7} />
      <circle cx="19.4" cy="8.4" r="0.85" fill="currentColor" stroke="none" opacity={0.7} />
      <circle cx="4.6" cy="8.4" r="0.85" fill="currentColor" stroke="none" opacity={0.7} />
      <path d="M12 4.6v1M18.6 9l-.9.5M5.4 9l.9.5" {...strokeProps} opacity={0.45} />
    </Base>
  );
}

export function IconRelationships(props: IconProps) {
  return (
    <Base title={props.title ?? "Relationships"} {...props}>
      {/* Two identities bonded by a continuous thread */}
      <circle cx="8.4" cy="9.4" r="2.6" {...strokeProps} />
      <circle cx="15.8" cy="9.4" r="2.6" {...strokeProps} />
      <path d="M4.6 18.4c.5-2.6 2-4.1 3.8-4.1 1.1 0 2 .5 2.7 1.4" {...strokeProps} />
      <path d="M19.4 18.4c-.5-2.6-2-4.1-3.8-4.1-1.1 0-2 .5-2.7 1.4" {...strokeProps} />
      <path d="M10.9 17.2a1.6 1.6 0 0 1 2.2 0" {...strokeProps} opacity={0.85} />
      <circle cx="12" cy="19" r="0.9" fill="currentColor" stroke="none" opacity={0.85} />
    </Base>
  );
}

export function IconCommunications(props: IconProps) {
  return (
    <Base title={props.title ?? "Communications"} {...props}>
      {/* Governed two-way exchange */}
      <path d="M4 6.8h10a1.6 1.6 0 0 1 1.6 1.6v3.4a1.6 1.6 0 0 1-1.6 1.6H9.4L6.4 16v-2.6H5.6A1.6 1.6 0 0 1 4 11.8V8.4A1.6 1.6 0 0 1 5.6 6.8Z" {...strokeProps} />
      <path d="M18.4 10.2h.4a1.6 1.6 0 0 1 1.6 1.6v3.4a1.6 1.6 0 0 1-1.6 1.6h-.8V19l-3-2.2h-3.4" {...strokeProps} opacity={0.8} />
      <path d="M7.2 9.4h5.6M7.2 11.4h3.6" {...strokeProps} opacity={0.85} />
    </Base>
  );
}

const MAP: Record<TapConnectIconId, (p: IconProps) => ReactNode> = {
  card: IconCard,
  brand: IconBrand,
  assets: IconAssets,
  tap_points: IconTapPoints,
  campaigns: IconCampaigns,
  tapsave: IconTapSave,
  audience: IconAudience,
  email: IconEmail,
  service: IconService,
  autopilot: IconAutopilot,
  insights: IconInsights,
  tapproof: IconTapProof,
  relationships: IconRelationships,
  communications: IconCommunications,
  integrations: IconIntegrations,
  trust_fabric: IconTrustFabric,
  settings: IconSettings,
  create: IconCreate,
  home: IconHome,
};

export function TapConnectIcon({
  id,
  className,
  title,
  decorative = false,
  ...rest
}: IconProps & { id: TapConnectIconId }) {
  const Comp = MAP[id];
  return <Comp className={className} title={title} decorative={decorative} {...rest} />;
}
