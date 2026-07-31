"use client";

import {
  Activity,
  BadgeCheck,
  Bell,
  Blocks,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleDot,
  Command,
  Database,
  ExternalLink,
  FileClock,
  Gauge,
  History,
  KeyRound,
  LayoutDashboard,
  Menu,
  MonitorSmartphone,
  MoreHorizontal,
  PanelRightClose,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  SquareArrowOutUpRight,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ControlSnapshot } from "@/lib/control/snapshot";
import { CONTROL_COMMANDS, executeCommand } from "@/lib/control/commands";
import { PLATFORM_PERMISSIONS } from "@/lib/control/permissions";

type Section =
  | "overview"
  | "users"
  | "businesses"
  | "roles"
  | "entitlements"
  | "support"
  | "demo"
  | "audit"
  | "configuration";

type ActionField = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "email" | "number" | "datetime-local" | "select" | "checkbox";
  required?: boolean;
  value?: string | number | boolean;
  options?: { label: string; value: string }[];
  hint?: string;
};

type ActionSpec = {
  operation: string;
  title: string;
  description: string;
  consequence: string;
  fields: ActionField[];
  destructive?: boolean;
  relatedActions?: ActionSpec[];
};

type ControlRoomProps = {
  snapshot: ControlSnapshot;
  initialSection: string;
  viewAsUser: { id: string; name: string } | null;
  supportSession: {
    id: string;
    actorName: string;
    subjectName: string;
    status: string;
    expiresAt: string;
  } | null;
};

const NAVIGATION: {
  id: Section;
  label: string;
  short: string;
  icon: typeof LayoutDashboard;
  permission: string;
}[] = [
  { id: "overview", label: "Overview", short: "Overview", icon: LayoutDashboard, permission: "platform.dashboard.view" },
  { id: "users", label: "Users & Administrators", short: "Users", icon: Users, permission: "users.view" },
  { id: "businesses", label: "Businesses & Workspaces", short: "Workspaces", icon: Building2, permission: "businesses.view" },
  { id: "roles", label: "Roles & Access", short: "Access", icon: KeyRound, permission: "roles.view" },
  { id: "entitlements", label: "Plans & Entitlements", short: "Plans", icon: Blocks, permission: "entitlements.view" },
  { id: "support", label: "Sessions & Support", short: "Support", icon: MonitorSmartphone, permission: "users.support_view" },
  { id: "demo", label: "Demo Studio", short: "Demos", icon: Sparkles, permission: "demo.view" },
  { id: "audit", label: "Audit & Approvals", short: "Audit", icon: History, permission: "audit.view" },
  { id: "configuration", label: "Platform Configuration", short: "Settings", icon: Settings2, permission: "platform.settings.view" },
];

const PAGE_SIZE = 8;

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

function relativeTime(value: string | null) {
  if (!value) return "Never";
  const delta = Date.now() - new Date(value).getTime();
  if (delta < 60_000) return "Just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

function sentence(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function StatusPill({
  value,
  tone,
}: {
  value: string;
  tone?: "good" | "warn" | "bad" | "info";
}) {
  const resolved =
    tone ??
    (/active|online|published|approved|allow/i.test(value)
      ? "good"
      : /pending|recent|idle|trial|restricted|draft|submitted/i.test(value)
        ? "warn"
        : /suspend|archive|delete|failed|reject|deny|expired/i.test(value)
          ? "bad"
          : "info");
  const label = value.includes(".") ? value : sentence(value);
  return <span className={`control-status control-status--${resolved}`}>{label}</span>;
}

function Avatar({
  name,
  imageUrl,
  alt,
  size = "normal",
}: {
  name: string;
  imageUrl?: string | null;
  alt?: string | null;
  size?: "small" | "normal" | "large";
}) {
  return (
    <span className={`control-avatar control-avatar--${size}`}>
      {imageUrl ? <Image src={imageUrl} alt={alt ?? `${name} profile`} width={68} height={68} unoptimized /> : <span aria-label={`${name} initials`}>{initials(name)}</span>}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="control-section-heading">
      <div>
        <p className="control-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="control-heading-actions">{actions}</div> : null}
    </header>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone = "info",
  icon: Icon,
  onClick,
}: {
  label: string;
  value: number | string;
  detail: string;
  tone?: "good" | "warn" | "bad" | "info";
  icon: typeof Gauge;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className={`control-metric-icon control-metric-icon--${tone}`}><Icon /></span>
      <span className="control-metric-value">{value}</span>
      <span className="control-metric-label">{label}</span>
      <span className="control-metric-detail">{detail}</span>
    </>
  );
  return onClick ? (
    <button className="control-metric-card control-metric-card--button" onClick={onClick} type="button">
      {content}
    </button>
  ) : (
    <article className="control-metric-card">{content}</article>
  );
}

function TableShell({
  title,
  description,
  search,
  onSearch,
  count,
  children,
  empty,
  page,
  pages,
  onPage,
  filters,
}: {
  title: string;
  description: string;
  search: string;
  onSearch: (value: string) => void;
  count: number;
  children: ReactNode;
  empty: string;
  page: number;
  pages: number;
  onPage: (page: number) => void;
  filters?: ReactNode;
}) {
  return (
    <section className="control-table-card">
      <header className="control-table-toolbar">
        <div>
          <h2>{title}</h2>
          <p>{description} · {count} records</p>
        </div>
        <div className="control-table-tools">
          <label className="control-search-field">
            <Search aria-hidden="true" />
            <span className="sr-only">Search {title}</span>
            <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} />
          </label>
          {filters}
        </div>
      </header>
      <div className="control-table-scroll">
        {count === 0 ? (
          <div className="control-empty"><Search aria-hidden="true" /><h3>No matching records</h3><p>{empty}</p></div>
        ) : children}
      </div>
      {pages > 1 ? (
        <footer className="control-pagination">
          <span>Page {page + 1} of {pages}</span>
          <div>
            <button type="button" onClick={() => onPage(Math.max(0, page - 1))} disabled={page === 0} aria-label="Previous page"><ChevronLeft /></button>
            <button type="button" onClick={() => onPage(Math.min(pages - 1, page + 1))} disabled={page >= pages - 1} aria-label="Next page"><ChevronRight /></button>
          </div>
        </footer>
      ) : null}
    </section>
  );
}

function ActionButton({
  children,
  onClick,
  kind = "secondary",
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  kind?: "primary" | "secondary" | "danger" | "quiet";
  disabled?: boolean;
}) {
  return <button type="button" className={`control-button control-button--${kind}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function ControlRoom({
  snapshot,
  initialSection,
  viewAsUser,
  supportSession,
}: ControlRoomProps) {
  const router = useRouter();
  const [section, setSection] = useState<Section>((initialSection as Section) || "overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [action, setAction] = useState<ActionSpec | null>(null);
  const [notice, setNotice] = useState<{ tone: "good" | "bad"; message: string } | null>(null);
  const allowedPermissions = useMemo<Set<string>>(
    () => new Set<string>(snapshot.effectivePermissions.filter((entry) => entry.allowed).map((entry) => entry.permission)),
    [snapshot.effectivePermissions],
  );
  const navigation = NAVIGATION.filter((item) => allowedPermissions.has(item.permission));
  const currentNav = navigation.find((item) => item.id === section) ?? navigation[0];

  function navigate(next: Section) {
    setSection(next);
    setRailOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("section", next);
    window.history.replaceState(null, "", url);
  }

  function openAction(spec: ActionSpec) {
    setAction(spec);
    setDrawerOpen(true);
    setNotice(null);
  }

  async function quickMutation(operation: string, data: Record<string, unknown>) {
    setNotice(null);
    const response = await fetch("/api/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation, data }),
    });
    const result = (await response.json()) as { ok?: boolean; message?: string; error?: string };
    if (!response.ok || !result.ok) {
      setNotice({ tone: "bad", message: result.error ?? "The action could not be completed." });
      return false;
    }
    setNotice({ tone: "good", message: result.message ?? "Action completed." });
    router.refresh();
    return true;
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
        setGlobalSearchOpen(false);
        if (drawerOpen) setDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  useEffect(() => {
    const sessionId = window.sessionStorage.getItem("tapconnect-control-session") ?? crypto.randomUUID();
    window.sessionStorage.setItem("tapconnect-control-session", sessionId);
    const send = () => {
      if (document.visibilityState !== "visible" || viewAsUser) return;
      void fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "heartbeat",
          data: { sessionId, majorArea: section },
        }),
      });
    };
    send();
    const timer = window.setInterval(send, 45_000);
    return () => window.clearInterval(timer);
  }, [section, viewAsUser]);

  return (
    <div className="control-root">
      <a href="#control-main" className="control-skip">Skip to main content</a>
      {viewAsUser ? (
        <div className="control-mode-banner control-mode-banner--view">
          <ShieldAlert aria-hidden="true" />
          <div><strong>View as User — read-only</strong><span>You are previewing {viewAsUser.name}’s effective access. All mutations are blocked.</span></div>
          <button type="button" onClick={() => void quickMutation("view_as.exit", {})}>Exit view</button>
        </div>
      ) : null}
      {supportSession ? (
        <div className="control-mode-banner control-mode-banner--support">
          <UserCog aria-hidden="true" />
          <div><strong>Support session</strong><span>{supportSession.actorName} is acting as {supportSession.subjectName}. Restricted actions are blocked and all activity is recorded.</span></div>
          <button type="button" onClick={() => void quickMutation("support.exit", { id: supportSession.id, reason: "Administrator exited Support Session" })}>Exit support session</button>
        </div>
      ) : null}
      <header className="control-topbar">
        <div className="control-brand">
          <button className="control-mobile-menu" type="button" onClick={() => setRailOpen(true)} aria-label="Open navigation"><Menu /></button>
          <span className="control-brand-mark"><CircleDot /></span>
          <div><strong>TapConnect</strong><span>Control Room</span></div>
        </div>
        <div className={`control-environment control-environment--${snapshot.actor.environment}`}>
          <Database aria-hidden="true" />
          <span>{snapshot.actor.environment === "production" ? "PRODUCTION — LIVE CUSTOMER DATA" : snapshot.actor.environment === "staging" ? "STAGING — NON-CUSTOMER TEST DATA" : "LOCAL — FIXTURE DATA ONLY"}</span>
        </div>
        <div className="control-condition">
          <span className="control-condition-dot" />
          <span>Condition</span>
          <strong>{snapshot.counts.pendingApprovals || snapshot.counts.deletionRequests ? "Attention" : "Stable"}</strong>
        </div>
        <div className="control-top-counts">
          <button type="button" onClick={() => navigate("audit")}><CircleAlert />0 incidents</button>
          <button type="button" onClick={() => navigate("audit")}><FileClock />{snapshot.counts.pendingApprovals} approvals</button>
        </div>
        <div className="control-top-actions">
          <button type="button" onClick={() => setGlobalSearchOpen(true)} aria-label="Global search"><Search /></button>
          <button type="button" onClick={() => setPaletteOpen(true)} aria-label="Open command palette"><Command /><kbd>⌘K</kbd></button>
          <button type="button" aria-label="Notifications"><Bell /><span className="control-notification-dot" /></button>
          <button type="button" className="control-profile-trigger" onClick={() => setDrawerOpen(true)} aria-label="Profile and session controls">
            <Avatar name={snapshot.actor.displayName} imageUrl={snapshot.actor.imageUrl} size="small" />
            <span><strong>{snapshot.actor.displayName}</strong><small>{snapshot.actor.roleNames.join(" · ")}</small></span>
            <ChevronDown />
          </button>
        </div>
      </header>
      <div className="control-shell">
        <aside className={`control-rail ${railOpen ? "control-rail--open" : ""}`}>
          <div className="control-rail-mobile-head"><strong>Control Room</strong><button type="button" onClick={() => setRailOpen(false)} aria-label="Close navigation"><X /></button></div>
          <nav aria-label="Control Room">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} type="button" className={section === item.id ? "is-selected" : ""} onClick={() => navigate(item.id)} aria-current={section === item.id ? "page" : undefined}>
                  <Icon /><span>{item.short}</span>
                </button>
              );
            })}
          </nav>
          <div className="control-rail-foot"><Shield /><span>Internal<br />governed</span></div>
        </aside>
        {railOpen ? <button className="control-rail-scrim" type="button" onClick={() => setRailOpen(false)} aria-label="Dismiss navigation backdrop" /> : null}
        <aside className="control-drawer-nav">
          <div className="control-context-title"><span>{currentNav?.label}</span><small>Platform operations</small></div>
          <nav aria-label={`${currentNav?.label} context`}>
            <button type="button" className="is-selected"><span>Workspace</span><ChevronRight /></button>
            {section === "users" ? <><button type="button"><span>Invitations</span><span>{snapshot.counts.pendingInvitations}</span></button><button type="button"><span>Active now</span><span>{snapshot.counts.usersOnline}</span></button></> : null}
            {section === "businesses" ? <><button type="button"><span>Internal</span><span>{snapshot.counts.internalWorkspaces}</span></button><button type="button"><span>Sandboxes</span><span>{snapshot.counts.personalSandboxes}</span></button></> : null}
            {section === "entitlements" ? <><button type="button"><span>Expiring grants</span><span>{snapshot.counts.expiringGrants}</span></button><button type="button"><span>Service catalog</span><span>{snapshot.services.length}</span></button></> : null}
            {section === "demo" ? <><button type="button"><span>Shared portfolio</span><span>{snapshot.demos.filter((demo) => demo.visibility === "SHARED").length}</span></button><button type="button"><span>Landing binding</span><span>{snapshot.landingBindings.filter((binding) => binding.active).length}</span></button></> : null}
            {section === "audit" ? <><button type="button"><span>Pending approvals</span><span>{snapshot.counts.pendingApprovals}</span></button><button type="button"><span>Privileged history</span><span>{snapshot.audit.length}</span></button></> : null}
          </nav>
          <div className="control-context-meta"><span>Snapshot</span><strong>{new Date(snapshot.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</strong><button type="button" onClick={() => router.refresh()}><RefreshCw />Refresh</button></div>
        </aside>
        <main id="control-main" className="control-main" tabIndex={-1}>
          {notice ? <div className={`control-notice control-notice--${notice.tone}`} role="status">{notice.tone === "good" ? <Check /> : <CircleAlert />}<span>{notice.message}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss"><X /></button></div> : null}
          {section === "overview" ? <Overview snapshot={snapshot} navigate={navigate} /> : null}
          {section === "users" ? <UsersSection snapshot={snapshot} openAction={openAction} quickMutation={quickMutation} /> : null}
          {section === "businesses" ? <BusinessesSection snapshot={snapshot} openAction={openAction} /> : null}
          {section === "roles" ? <RolesSection snapshot={snapshot} openAction={openAction} /> : null}
          {section === "entitlements" ? <EntitlementsSection snapshot={snapshot} openAction={openAction} /> : null}
          {section === "support" ? <SupportSection snapshot={snapshot} openAction={openAction} /> : null}
          {section === "demo" ? <DemoSection snapshot={snapshot} openAction={openAction} /> : null}
          {section === "audit" ? <AuditSection snapshot={snapshot} openAction={openAction} /> : null}
          {section === "configuration" ? <ConfigurationSection snapshot={snapshot} openAction={openAction} /> : null}
        </main>
      </div>
      <ActionDrawer action={action} open={drawerOpen} onClose={() => { setDrawerOpen(false); setAction(null); }} onSelectAction={openAction} onComplete={(message) => { setNotice({ tone: "good", message }); router.refresh(); }} profileFallback={!action ? snapshot : null} />
      {paletteOpen ? <CommandPalette allowedPermissions={allowedPermissions} onClose={() => setPaletteOpen(false)} onNavigate={(next) => { if (next.kind === "navigate") { const url = new URL(next.href, window.location.origin); navigate((url.searchParams.get("section") as Section) ?? "overview"); } else { openAction(preparedAction(next.action, snapshot)); } setPaletteOpen(false); }} /> : null}
      {globalSearchOpen ? <GlobalSearch snapshot={snapshot} query={globalQuery} setQuery={setGlobalQuery} onClose={() => setGlobalSearchOpen(false)} onNavigate={(next) => { navigate(next); setGlobalSearchOpen(false); }} /> : null}
    </div>
  );
}

function Overview({ snapshot, navigate }: { snapshot: ControlSnapshot; navigate: (section: Section) => void }) {
  const attention = [
    snapshot.counts.pendingApprovals ? { severity: "warn" as const, title: `${snapshot.counts.pendingApprovals} approval request${snapshot.counts.pendingApprovals === 1 ? "" : "s"} waiting`, detail: "Sensitive actions are paused until an eligible second administrator decides.", action: "Review approvals", section: "audit" as Section } : null,
    snapshot.counts.deletionRequests ? { severity: "bad" as const, title: `${snapshot.counts.deletionRequests} governed deletion workflow${snapshot.counts.deletionRequests === 1 ? "" : "s"}`, detail: "Affected records remain retained during their grace period and legal-hold checks.", action: "Inspect lifecycle", section: "businesses" as Section } : null,
    snapshot.counts.expiringGrants ? { severity: "warn" as const, title: `${snapshot.counts.expiringGrants} entitlement grant${snapshot.counts.expiringGrants === 1 ? "" : "s"} expiring`, detail: "Affected workspaces may lose capability within 30 days.", action: "Review grants", section: "entitlements" as Section } : null,
  ].filter(Boolean) as { severity: "warn" | "bad"; title: string; detail: string; action: string; section: Section }[];
  const activeBinding = snapshot.landingBindings.find((binding) => binding.active);
  return (
    <>
      <SectionHeading eyebrow="Platform snapshot" title="Everything that governs Studio, in one place." description="Truthful identity, workspace, entitlement, support, demo, and governance state. Customer operations remain in Studio." />
      <section className="control-metric-grid">
        <MetricCard icon={Activity} label="Active users now" value={snapshot.counts.usersOnline} detail={`${snapshot.counts.usersRecentlyActive} recently active`} tone="good" onClick={() => navigate("users")} />
        <MetricCard icon={Building2} label="Active businesses" value={snapshot.counts.activeBusinesses} detail={`${snapshot.counts.internalWorkspaces} internal workspaces`} onClick={() => navigate("businesses")} />
        <MetricCard icon={Sparkles} label="Demo workspaces" value={snapshot.counts.demoWorkspaces} detail={`${snapshot.counts.personalSandboxes} personal sandboxes`} onClick={() => navigate("demo")} />
        <MetricCard icon={UserCog} label="Support sessions" value={snapshot.counts.activeSupportSessions} detail="Governed access active" tone={snapshot.counts.activeSupportSessions ? "warn" : "good"} onClick={() => navigate("support")} />
        <MetricCard icon={FileClock} label="Pending invitations" value={snapshot.counts.pendingInvitations} detail="Draft, sent, or viewed" tone={snapshot.counts.pendingInvitations ? "warn" : "info"} onClick={() => navigate("users")} />
        <MetricCard icon={ShieldAlert} label="Pending approvals" value={snapshot.counts.pendingApprovals} detail="Separation of duties enforced" tone={snapshot.counts.pendingApprovals ? "warn" : "good"} onClick={() => navigate("audit")} />
      </section>
      <div className="control-overview-grid">
        <section className="control-panel">
          <header><div><p className="control-eyebrow">Needs attention</p><h2>Actionable platform state</h2></div><span>{attention.length}</span></header>
          {attention.length ? <div className="control-attention-list">{attention.map((item) => <article key={item.title}><span className={`control-severity control-severity--${item.severity}`}><CircleAlert /></span><div><h3>{item.title}</h3><p>{item.detail}</p><button type="button" onClick={() => navigate(item.section)}>{item.action}<ChevronRight /></button></div></article>)}</div> : <div className="control-empty control-empty--compact"><BadgeCheck /><h3>No governed action is waiting</h3><p>This reflects current Control Room records, not a synthetic provider-health claim.</p></div>}
        </section>
        <section className="control-panel">
          <header><div><p className="control-eyebrow">Landing Demo contract</p><h2>Current public Card binding</h2></div><Sparkles /></header>
          {activeBinding ? <div className="control-binding-card"><StatusPill value="Active" /><h3>{activeBinding.demoName}</h3><p>Slot <code>{activeBinding.slotKey}</code> resolves to immutable publication <code>{activeBinding.demoPublicationId}</code>.</p><div><span>Activated</span><strong>{relativeTime(activeBinding.activatedAt)}</strong></div><button type="button" onClick={() => navigate("demo")}>Inspect binding<ChevronRight /></button></div> : <div className="control-empty control-empty--compact"><Sparkles /><h3>No Demo Card is bound</h3><p>The public endpoint returns an explicit safe fallback until an administrator activates a published revision.</p><button type="button" onClick={() => navigate("demo")}>Open Demo Studio</button></div>}
        </section>
        <section className="control-panel control-panel--wide">
          <header><div><p className="control-eyebrow">Privileged activity</p><h2>Recent governed changes</h2></div><History /></header>
          <div className="control-timeline">{snapshot.audit.slice(0, 8).map((event) => <article key={event.id}><span className={event.success ? "is-success" : "is-failed"} /><div><strong>{sentence(event.action)}</strong><p>{event.reason ?? `${event.resourceType} ${event.resourceId}`}</p></div><time>{relativeTime(event.occurredAt)}</time></article>)}</div>
        </section>
      </div>
    </>
  );
}

function UsersSection({ snapshot, openAction, quickMutation }: { snapshot: ControlSnapshot; openAction: (spec: ActionSpec) => void; quickMutation: (operation: string, data: Record<string, unknown>) => Promise<boolean> }) {
  const [tab, setTab] = useState<"directory" | "invitations">("directory");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(0);
  const filtered = snapshot.users.filter((user) => {
    const haystack = [user.displayName, user.email, user.id, user.clerkId, user.roles.map((role) => role.name).join(" "), user.memberships.map((membership) => membership.businessName).join(" ")].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase()) && (status === "ALL" || user.status === status || user.presence === status);
  });
  const rows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  return (
    <>
      <SectionHeading eyebrow="Identity & lifecycle" title="Users & Administrators" description="Clerk authenticates the person. TapConnect governs roles, business scope, sessions, restrictions, and lifecycle." actions={<ActionButton kind="primary" onClick={() => openAction(inviteAction(snapshot))}><Plus />Invite administrator</ActionButton>} />
      <div className="control-tabs" role="tablist"><button role="tab" aria-selected={tab === "directory"} onClick={() => setTab("directory")}>Directory <span>{snapshot.users.length}</span></button><button role="tab" aria-selected={tab === "invitations"} onClick={() => setTab("invitations")}>Invitations <span>{snapshot.invitations.length}</span></button></div>
      {tab === "directory" ? (
        <TableShell title="User directory" description="Immutable identity, access, activity, and account state" search={query} onSearch={(value) => { setQuery(value); setPage(0); }} count={filtered.length} empty="Adjust the search or status filter." page={page} pages={Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))} onPage={setPage} filters={<label className="control-filter"><SlidersHorizontal /><select aria-label="Filter users by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}><option value="ALL">All states</option><option value="Online">Online now</option><option value="Recently active">Recently active</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="ARCHIVED">Archived</option><option value="DELETION_SCHEDULED">Deletion scheduled</option></select></label>}>
          <table><thead><tr><th>User</th><th>Platform access</th><th>Businesses</th><th>Presence</th><th>Sessions</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((user) => <tr key={user.id}><td><button className="control-person-cell" type="button" onClick={() => openAction(userDetailAction(user, snapshot))}><Avatar name={user.displayName} imageUrl={user.imageUrl} alt={user.profilePhotoAlt} /><span><strong>{user.displayName}</strong><small>{user.email}</small><code>{user.clerkId ?? "Invitation not bound"}</code></span></button></td><td><div className="control-pill-stack">{user.roles.length ? user.roles.map((role) => <StatusPill key={`${role.id}-${role.businessId}`} value={role.name} tone="info" />) : <StatusPill value="No platform role" tone="bad" />}{user.directPermissions.map((permission) => <StatusPill key={permission.key} value={`${permission.effect}: ${permission.key}`} />)}</div></td><td><span className="control-count-link">{user.memberships.length} workspace{user.memberships.length === 1 ? "" : "s"}</span><small>{user.memberships.slice(0, 2).map((membership) => membership.businessName).join(" · ")}</small></td><td><StatusPill value={user.presence} /><small>{user.currentArea ?? relativeTime(user.lastSeenAt)}</small></td><td><strong>{user.sessionCount}</strong><small>{user.sessions[0]?.browserSummary ?? "No device summary"}</small></td><td><button className="control-row-action" type="button" onClick={() => openAction(userDetailAction(user, snapshot))} aria-label={`Open actions for ${user.displayName}`}><MoreHorizontal /></button></td></tr>)}</tbody></table>
        </TableShell>
      ) : <InvitationsTable snapshot={snapshot} openAction={openAction} quickMutation={quickMutation} />}
    </>
  );
}

function InvitationsTable({ snapshot, openAction, quickMutation }: { snapshot: ControlSnapshot; openAction: (spec: ActionSpec) => void; quickMutation: (operation: string, data: Record<string, unknown>) => Promise<boolean> }) {
  const [query, setQuery] = useState("");
  const invitations = snapshot.invitations.filter((item) => `${item.displayName} ${item.email} ${item.role} ${item.status}`.toLowerCase().includes(query.toLowerCase()));
  return <TableShell title="Administrator invitations" description="Draft-to-acceptance identity binding with explicit scope" search={query} onSearch={setQuery} count={invitations.length} empty="Create an invitation to begin the governed administrator onboarding flow." page={0} pages={1} onPage={() => {}}>
    <table><thead><tr><th>Invitee</th><th>Initial role</th><th>Safety</th><th>Status</th><th>Expires</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{invitations.map((invitation) => <tr key={invitation.id}><td><strong>{invitation.displayName}</strong><small>{invitation.email}</small></td><td>{invitation.role}</td><td><div className="control-pill-stack"><StatusPill value={invitation.requireMfa ? "MFA required" : "MFA optional"} tone={invitation.requireMfa ? "good" : "warn"} />{invitation.createSandbox ? <StatusPill value="Sandbox" tone="info" /> : null}</div></td><td><StatusPill value={invitation.status} /></td><td>{relativeTime(invitation.expiresAt)}</td><td><div className="control-inline-actions">{["DRAFT", "EXPIRED", "FAILED"].includes(invitation.status) ? <button type="button" aria-label={`Send ${invitation.displayName}'s fixture invitation`} onClick={() => openAction(simpleReasonAction("invitation.send", "Send fixture invitation", "A new secure link is generated. No Email is sent in this wave.", { id: invitation.id }))}><Play /></button> : null}{["SENT", "VIEWED"].includes(invitation.status) ? <button type="button" aria-label={`Revoke ${invitation.displayName}'s invitation`} onClick={() => openAction(simpleReasonAction("invitation.revoke", "Revoke invitation", "The secure invitation link will stop working immediately.", { id: invitation.id }, true))}><X /></button> : null}<button type="button" onClick={() => void quickMutation("invitation.expire", { id: invitation.id, reason: "Fixture lifecycle acceptance proof" })} aria-label={`Expire ${invitation.displayName}'s invitation`}><FileClock /></button></div></td></tr>)}</tbody></table>
  </TableShell>;
}

function BusinessesSection({ snapshot, openAction }: { snapshot: ControlSnapshot; openAction: (spec: ActionSpec) => void }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("ALL");
  const [page, setPage] = useState(0);
  const filtered = snapshot.businesses.filter((business) => `${business.name} ${business.slug} ${business.workspaceKind} ${business.lifecycleState} ${business.members.map((member) => member.name).join(" ")}`.toLowerCase().includes(query.toLowerCase()) && (kind === "ALL" || business.workspaceKind === kind));
  const rows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  return <>
    <SectionHeading eyebrow="Tenancy & workspace lifecycle" title="Businesses & Workspaces" description="Customer, internal, sandbox, demo, partner, and local fixture workspaces remain distinct and governed." actions={<ActionButton kind="primary" onClick={() => openAction(createBusinessAction(snapshot))}><Plus />Create workspace</ActionButton>} />
    <TableShell title="Business directory" description="Owners, plan source, restrictions, publication state, and lifecycle" search={query} onSearch={(value) => { setQuery(value); setPage(0); }} count={filtered.length} empty="No workspaces match the current query and kind." page={page} pages={Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))} onPage={setPage} filters={<label className="control-filter"><SlidersHorizontal /><select aria-label="Filter by workspace kind" value={kind} onChange={(event) => setKind(event.target.value)}><option value="ALL">All kinds</option><option value="CUSTOMER">Customer</option><option value="INTERNAL">Internal</option><option value="PERSONAL_SANDBOX">Personal sandbox</option><option value="DEMO">Demo</option><option value="PARTNER">Partner</option></select></label>}>
      <table><thead><tr><th>Workspace</th><th>Kind & state</th><th>Owner / members</th><th>Plan</th><th>Capabilities</th><th>Activity</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((business) => <tr key={business.id}><td><button type="button" className="control-business-cell" onClick={() => openAction(businessDetailAction(business, snapshot))}><span className="control-business-mark">{initials(business.name)}</span><span><strong>{business.name}</strong><code>{business.slug}</code></span></button></td><td><div className="control-pill-stack"><StatusPill value={business.workspaceKind} tone="info" /><StatusPill value={business.lifecycleState} /></div></td><td><strong>{business.members.find((member) => member.role === "OWNER")?.name ?? "Owner required"}</strong><small>{business.members.length} member{business.members.length === 1 ? "" : "s"}</small></td><td><strong>{business.plan?.name ?? business.subscriptionTier}</strong><small>{business.plan ? "Control Room plan" : "Legacy subscription snapshot"}</small></td><td><span>{business.restrictions.length} restriction{business.restrictions.length === 1 ? "" : "s"}</span><small>{business.overrides.length} override{business.overrides.length === 1 ? "" : "s"}</small></td><td><span>{business.counts.devices} Tap Points</span><small>{business.counts.campaigns} Campaigns · {business.counts.mediaAssets} Assets</small></td><td><button className="control-row-action" type="button" onClick={() => openAction(businessDetailAction(business, snapshot))} aria-label={`Open ${business.name}`}><MoreHorizontal /></button></td></tr>)}</tbody></table>
    </TableShell>
  </>;
}

function RolesSection({ snapshot, openAction }: { snapshot: ControlSnapshot; openAction: (spec: ActionSpec) => void }) {
  const [selected, setSelected] = useState(snapshot.roles[0]?.id ?? "");
  const [comparedRoleId, setComparedRoleId] = useState("");
  const role = snapshot.roles.find((item) => item.id === selected);
  const comparedRole = snapshot.roles.find((item) => item.id === comparedRoleId);
  const currentPermissionKeys = new Set(role?.permissions.map((entry) => `${entry.effect}:${entry.key}`) ?? []);
  const comparedPermissionKeys = new Set(comparedRole?.permissions.map((entry) => `${entry.effect}:${entry.key}`) ?? []);
  const onlyCurrent = [...currentPermissionKeys].filter((key) => !comparedPermissionKeys.has(key));
  const onlyCompared = [...comparedPermissionKeys].filter((key) => !currentPermissionKeys.has(key));
  return <>
    <SectionHeading eyebrow="Granular authorization" title="Roles & Access" description="Role templates, scoped bindings, direct grants, and explicit denials resolve server-side. DENY always wins." actions={<ActionButton kind="primary" onClick={() => openAction(createRoleAction())}><Plus />Create role</ActionButton>} />
    <div className="control-role-layout">
      <section className="control-role-list"><header><h2>Role catalog</h2><span>{snapshot.roles.length}</span></header>{snapshot.roles.map((item) => <button type="button" className={item.id === selected ? "is-selected" : ""} key={item.id} onClick={() => setSelected(item.id)}><span className="control-role-icon"><KeyRound /></span><span><strong>{item.name}</strong><small>{item.permissions.length} permissions · {item.users.length} users</small></span><StatusPill value={item.status} /></button>)}</section>
      {role ? <section className="control-role-detail"><header><div><div className="control-pill-stack">{role.protected ? <StatusPill value="Protected template" tone="info" /> : <StatusPill value="Custom role" tone="warn" />}{role.ownerRole ? <StatusPill value="Governed Owner" tone="bad" /> : null}</div><h2>{role.name}</h2><p>{role.description}</p></div><div className="control-heading-actions">{!role.ownerRole ? <ActionButton onClick={() => openAction(assignRoleAction(role, snapshot))}>Assign</ActionButton> : null}{!role.protected ? <ActionButton onClick={() => openAction(editRoleAction(role))}>Edit permissions</ActionButton> : null}<ActionButton onClick={() => openAction(cloneRoleAction(role))}>Clone</ActionButton>{!role.protected ? <ActionButton kind="danger" onClick={() => openAction(retireRoleAction(role, snapshot))}>Retire</ActionButton> : null}</div></header><div className="control-role-columns"><div><h3>Effective template permissions</h3><div className="control-permission-grid">{role.permissions.map((entry) => <span key={entry.key} className={entry.effect === "DENY" ? "is-deny" : ""}><Check />{entry.key}</span>)}</div></div><div><h3>Assigned administrators</h3>{role.users.length ? <div className="control-assignee-list">{role.users.map((user) => <div key={user.id}><Avatar name={user.name} size="small" /><span>{user.name}</span></div>)}</div> : <div className="control-empty control-empty--compact"><Users /><p>No active assignments.</p></div>}<h3>Role comparison</h3><p className="control-helper">Select another role to compare permission differences before migrating assignments.</p><select className="control-select" aria-label="Compare with role" value={comparedRoleId} onChange={(event) => setComparedRoleId(event.target.value)}><option value="">Choose a role…</option>{snapshot.roles.filter((item) => item.id !== role.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{comparedRole ? <div className="control-role-diff" aria-live="polite"><strong>{role.name} ↔ {comparedRole.name}</strong><span>{onlyCurrent.length} only in {role.name}</span><span>{onlyCompared.length} only in {comparedRole.name}</span><div>{onlyCurrent.slice(0, 8).map((key) => <code key={`current-${key}`}>− {key}</code>)}{onlyCompared.slice(0, 8).map((key) => <code key={`compared-${key}`}>+ {key}</code>)}{onlyCurrent.length + onlyCompared.length === 0 ? <small>Permission sets are identical.</small> : null}</div></div> : null}</div></div></section> : null}
    </div>
    <section className="control-explanation"><Shield /><div><strong>Current administrator access</strong><p>{snapshot.effectivePermissions.filter((entry) => entry.allowed).length} permissions allowed. Every source and denial is visible in the profile inspector.</p></div><div className="control-pill-stack">{snapshot.actor.roleNames.map((name) => <StatusPill key={name} value={`Allowed through ${name}`} tone="good" />)}</div></section>
  </>;
}

function EntitlementsSection({ snapshot, openAction }: { snapshot: ControlSnapshot; openAction: (spec: ActionSpec) => void }) {
  const [tab, setTab] = useState<"plans" | "services" | "grants">("plans");
  return <>
    <SectionHeading eyebrow="Capability governance" title="Plans & Entitlements" description="Plan entitlements + add-ons + administrator overrides − active restrictions = effective access." actions={<ActionButton kind="primary" onClick={() => openAction(grantAction(snapshot))}><Plus />Grant service</ActionButton>} />
    <div className="control-tabs" role="tablist"><button role="tab" aria-selected={tab === "plans"} onClick={() => setTab("plans")}>Plan catalog <span>{snapshot.plans.length}</span></button><button role="tab" aria-selected={tab === "services"} onClick={() => setTab("services")}>Service catalog <span>{snapshot.services.length}</span></button><button role="tab" aria-selected={tab === "grants"} onClick={() => setTab("grants")}>Overrides <span>{snapshot.overrides.length}</span></button></div>
    {tab === "plans" ? <div className="control-card-grid">{snapshot.plans.map((plan) => <article className="control-catalog-card" key={plan.id}><header><div><StatusPill value={plan.status} /><h2>{plan.name}</h2></div><span>{plan.assignedBusinessCount} assigned</span></header><p>{plan.description}</p><div className="control-allowance-grid"><span><strong>{plan.allowances.tapPoints}</strong>Tap Points</span><span><strong>{plan.allowances.locations}</strong>Locations</span><span><strong>{plan.allowances.campaigns}</strong>Campaigns</span><span><strong>{plan.allowances.ai}</strong>AI actions</span></div><div className="control-service-list">{plan.entitlements.slice(0, 8).map((entry) => <span key={entry.serviceId} className={entry.enabled ? "is-on" : "is-off"}><CircleDot />{entry.serviceName}</span>)}</div><footer><ActionButton onClick={() => openAction(clonePlanAction(plan))}>Clone plan</ActionButton><ActionButton kind="quiet" onClick={() => openAction(simpleReasonAction("plan.retire", `Retire ${plan.name}`, "Assigned businesses preserve their grandfathered reference.", { id: plan.id }, true))}>Retire</ActionButton></footer></article>)}</div> : null}
    {tab === "services" ? <div className="control-card-grid">{snapshot.services.map((service) => <article className="control-catalog-card" key={service.id}><header><div><StatusPill value={service.status} /><h2>{service.name}</h2></div><span>{service.category}</span></header><p>{service.description}</p><dl><div><dt>Availability</dt><dd>{sentence(service.availability)}</dd></div><div><dt>Plans</dt><dd>{service.counts.planEntitlements}</dd></div><div><dt>Overrides</dt><dd>{service.counts.overrides}</dd></div><div><dt>Restrictions</dt><dd>{service.counts.restrictions}</dd></div></dl>{service.dependencies.length ? <small>Requires {service.dependencies.join(", ")}</small> : <small>No service dependencies</small>}<footer><ActionButton kind="quiet" onClick={() => openAction(simpleReasonAction("service.retire", `Retire ${service.name}`, "The service remains in historical entitlement explanations.", { id: service.id }, true))}>Retire service</ActionButton></footer></article>)}</div> : null}
    {tab === "grants" ? <TableShell title="Entitlement overrides" description="Every manual grant has an actor, reason, source, status, and expiration" search="" onSearch={() => {}} count={snapshot.overrides.length} empty="No manual grants have been created." page={0} pages={1} onPage={() => {}}><table><thead><tr><th>Business</th><th>Service</th><th>Grant</th><th>Source</th><th>Expiration</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{snapshot.overrides.map((override) => <tr key={override.id}><td><strong>{override.businessName}</strong></td><td>{override.serviceName}</td><td>{override.enabled === false ? "Removed" : override.allowance ?? "Enabled"}</td><td><strong>{sentence(override.grantKind)}</strong><small>{override.reason}</small></td><td>{override.expiresAt ? relativeTime(override.expiresAt) : "No expiration"}</td><td><StatusPill value={override.status} /></td><td>{override.status === "ACTIVE" ? <button className="control-row-action" type="button" onClick={() => openAction(simpleReasonAction("entitlement.revoke", "Revoke entitlement override", "Effective access is recalculated immediately; restrictions still prevail.", { id: override.id }, true))}><X /></button> : null}</td></tr>)}</tbody></table></TableShell> : null}
  </>;
}

function SupportSection({ snapshot, openAction }: { snapshot: ControlSnapshot; openAction: (spec: ActionSpec) => void }) {
  return <>
    <SectionHeading eyebrow="Governed diagnostic access" title="Sessions & Support" description="View as User never creates a user session. Support Sessions preserve the administrator actor, expire automatically, and block sensitive actions." actions={<ActionButton kind="primary" onClick={() => openAction(startSupportAction(snapshot))}><UserCog />Start Support Session</ActionButton>} />
    <div className="control-support-modes"><article><span className="control-mode-icon"><Shield /></span><div><h2>View as User</h2><p>Read-only navigation and entitlement diagnosis. Every mutation is blocked and the administrator identity remains active.</p></div><ActionButton onClick={() => openAction(viewAsAction(snapshot))}>Choose user</ActionButton></article><article><span className="control-mode-icon control-mode-icon--warn"><UserCog /></span><div><h2>Support Session</h2><p>Governed impersonation with reason, business scope, expiry, permanent banner, and per-action audit history.</p></div><ActionButton onClick={() => openAction(startSupportAction(snapshot))}>Prepare session</ActionButton></article></div>
    <TableShell title="Support Session history" description="Actor, subject, scope, reason, expiry, and local adapter truth" search="" onSearch={() => {}} count={snapshot.supportSessions.length} empty="No Support Sessions have been started." page={0} pages={1} onPage={() => {}}><table><thead><tr><th>Actor → subject</th><th>Reason</th><th>Scope</th><th>Started</th><th>Expires</th><th>Status</th></tr></thead><tbody>{snapshot.supportSessions.map((session) => <tr key={session.id}><td><strong>{session.actorName} → {session.subjectName}</strong><small>{session.localFixture ? "Local deterministic adapter" : "Clerk actor-token adapter"}</small></td><td>{session.reason}</td><td>{session.businessId ?? "Platform diagnostic scope"}</td><td>{relativeTime(session.startedAt)}</td><td>{relativeTime(session.expiresAt)}</td><td><StatusPill value={session.status} /></td></tr>)}</tbody></table></TableShell>
    <section className="control-policy-card"><ShieldAlert /><div><h2>Blocked during every Support Session</h2><p>Role and permission changes, money movement, permanent deletion, sensitive exports, sends, publication, Tap Point assignment, credential changes, and landing-page Demo publication.</p></div></section>
  </>;
}

function DemoSection({ snapshot, openAction }: { snapshot: ControlSnapshot; openAction: (spec: ActionSpec) => void }) {
  const activeBinding = snapshot.landingBindings.find((binding) => binding.active);
  return <>
    <SectionHeading eyebrow="Safe public demonstration" title="Demo Studio" description="Private demos move through submission and review into the shared portfolio. Publication uses immutable Card snapshots and enforced no-send/no-payment policy." actions={<ActionButton kind="primary" onClick={() => openAction(createDemoAction())}><Plus />Create demo workspace</ActionButton>} />
    <section className="control-demo-binding"><div className="control-demo-binding-mark"><Sparkles /></div><div><p className="control-eyebrow">Landing-page Demo Card</p><h2>{activeBinding ? activeBinding.demoName : "No active binding"}</h2><p>{activeBinding ? `Slot ${activeBinding.slotKey} serves revision ${activeBinding.demoPublicationId}.` : "The public retrieval endpoint currently returns an explicit fallback."}</p></div>{activeBinding ? <div className="control-heading-actions"><a href={`/api/public/demo-card/${activeBinding.slotKey}`} target="_blank" rel="noreferrer" className="control-button control-button--secondary">Inspect payload<ExternalLink /></a>{activeBinding.priorBindingId ? <ActionButton onClick={() => openAction(simpleReasonAction("demo.binding.rollback", "Roll back landing binding", "The prior immutable Demo binding becomes active again.", { id: activeBinding.id }, true))}>Roll back</ActionButton> : null}<ActionButton kind="danger" onClick={() => openAction(simpleReasonAction("demo.binding.unbind", "Unbind landing Demo Card", "The public endpoint immediately returns the explicit no-binding fallback.", { id: activeBinding.id }, true))}>Unbind</ActionButton></div> : null}</section>
    <div className="control-demo-grid">{snapshot.demos.map((demo) => { const current = demo.publications.find((publication) => publication.id === demo.currentPublicationId); return <article className="control-demo-card" key={demo.id}><header><span className="control-demo-monogram">{initials(demo.name)}</span><div><div className="control-pill-stack"><StatusPill value={demo.visibility} tone="info" /><StatusPill value={demo.promotionStatus} /></div><h2>{demo.name}</h2><p>{demo.industryUseCase}</p></div><button type="button" className="control-row-action" onClick={() => openAction(demoDetailAction(demo))} aria-label={`Open ${demo.name} workflows`}><MoreHorizontal /></button></header><p>{demo.description}</p><dl><div><dt>Owner</dt><dd>{demo.ownerName}</dd></div><div><dt>Managers</dt><dd>{demo.managers.length}</dd></div><div><dt>Public revision</dt><dd>{current ? `v${current.version}` : "Not published"}</dd></div><div><dt>Last reset</dt><dd>{relativeTime(demo.lastResetAt)}</dd></div></dl><div className="control-safety-summary"><Shield /><span><strong>{demo.blockedActions.length} server safety blocks</strong><small>No real sends, payments, refunds, imports, or production Tap Point assignment.</small></span></div><footer>{current ? <ActionButton onClick={() => openAction(bindDemoAction(demo, current, snapshot))}>Bind to landing</ActionButton> : null}<ActionButton kind={current ? "quiet" : "primary"} onClick={() => openAction(simpleReasonAction("demo.publish", current ? `Publish new ${demo.name} revision` : `Publish ${demo.name}`, "Readiness is re-evaluated, then an immutable safe Card revision is created.", { id: demo.id }))}>{current ? "Publish new revision" : "Publish Card"}</ActionButton><ActionButton kind="quiet" onClick={() => openAction(simpleReasonAction("demo.reset", `Reset ${demo.name}`, "Fixture data returns to its governed baseline; publication history remains.", { id: demo.id }, true))}>Reset</ActionButton></footer></article>; })}</div>
  </>;
}

function AuditSection({ snapshot, openAction }: { snapshot: ControlSnapshot; openAction: (spec: ActionSpec) => void }) {
  const [tab, setTab] = useState<"audit" | "approvals">("audit");
  const [query, setQuery] = useState("");
  const events = snapshot.audit.filter((event) => `${event.action} ${event.actorId} ${event.resourceType} ${event.resourceId} ${event.correlationId} ${event.reason}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <SectionHeading eyebrow="Append-only governance" title="Audit & Approvals" description="Readable before/after history, correlation IDs, scoped actors, and separation-of-duties decisions." />
    <div className="control-tabs" role="tablist"><button role="tab" aria-selected={tab === "audit"} onClick={() => setTab("audit")}>Audit history <span>{snapshot.audit.length}</span></button><button role="tab" aria-selected={tab === "approvals"} onClick={() => setTab("approvals")}>Approvals <span>{snapshot.approvals.length}</span></button></div>
    {tab === "audit" ? <TableShell title="Privileged action history" description="Ordinary application access cannot update or delete these events" search={query} onSearch={setQuery} count={events.length} empty="No audit events match the current query." page={0} pages={1} onPage={() => {}}><table><thead><tr><th>Action</th><th>Actor</th><th>Target</th><th>Permission</th><th>Reason</th><th>When</th><th>Result</th></tr></thead><tbody>{events.slice(0, 100).map((event) => <tr key={event.id}><td><strong>{sentence(event.action)}</strong><code>{event.correlationId}</code></td><td>{event.actorId ?? "System"}<small>{event.actingSubjectId ? `Acting as ${event.actingSubjectId}` : event.environment}</small></td><td>{event.resourceType}<small>{event.resourceId}</small></td><td><code>{event.permissionUsed ?? "system policy"}</code></td><td>{event.reason ?? "Recorded platform event"}</td><td>{relativeTime(event.occurredAt)}</td><td><StatusPill value={event.success ? "Success" : "Failed"} /></td></tr>)}</tbody></table></TableShell> : <TableShell title="Approval requests" description="Requester and approver separation for policy-marked sensitive actions" search="" onSearch={() => {}} count={snapshot.approvals.length} empty="No sensitive actions are awaiting or have received approval." page={0} pages={1} onPage={() => {}}><table><thead><tr><th>Requested action</th><th>Target</th><th>Reason & consequence</th><th>Required approver</th><th>Status</th><th>Expires</th><th><span className="sr-only">Decision</span></th></tr></thead><tbody>{snapshot.approvals.map((approval) => <tr key={approval.id}><td><strong>{sentence(approval.actionKey)}</strong><small>Requested by {approval.requesterId}</small></td><td>{approval.targetType}<code>{approval.targetId}</code></td><td>{approval.reason}<small>{approval.consequence}</small></td><td>{approval.requiredApproverRole}</td><td><StatusPill value={approval.status} /></td><td>{relativeTime(approval.expiresAt)}</td><td>{approval.status === "PENDING" ? <div className="control-inline-actions"><button type="button" onClick={() => openAction(approvalAction(approval, true))} aria-label="Approve"><Check /></button><button type="button" onClick={() => openAction(approvalAction(approval, false))} aria-label="Reject"><X /></button></div> : null}</td></tr>)}</tbody></table></TableShell>}
  </>;
}

function ConfigurationSection({ snapshot, openAction }: { snapshot: ControlSnapshot; openAction: (spec: ActionSpec) => void }) {
  return <>
    <SectionHeading eyebrow="Wave-one policy" title="Platform Configuration" description="Non-secret environment labels, invitation, sandbox, demo, deletion, MFA, support, approval, and landing binding defaults." />
    <section className="control-config-grid">{snapshot.configuration.map((setting) => <article key={setting.id}><span className="control-config-icon"><Settings2 /></span><div><code>{setting.key}</code><h2>{setting.value}</h2><p>{setting.description}</p><small>Updated {relativeTime(setting.updatedAt)} · {setting.reason ?? "No reason recorded"}</small></div><button type="button" onClick={() => openAction(configurationAction(setting))}>Edit</button></article>)}</section>
    <section className="control-policy-card"><Database /><div><h2>Secrets stay outside platform settings</h2><p>Keys containing secret, token, password, or credential are rejected server-side. Authentication and provider credentials remain environment-managed.</p></div></section>
  </>;
}

function ActionDrawer({ action, open, onClose, onSelectAction, onComplete, profileFallback }: { action: ActionSpec | null; open: boolean; onClose: () => void; onSelectAction: (action: ActionSpec) => void; onComplete: (message: string) => void; profileFallback: ControlSnapshot | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resultLink, setResultLink] = useState("");
  const firstField = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);
  useEffect(() => { if (open) window.setTimeout(() => firstField.current?.focus(), 80); }, [open, action]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) return;
    setBusy(true); setError(""); setResultLink("");
    const form = new FormData(event.currentTarget);
    const data: Record<string, unknown> = {};
    for (const field of action.fields) {
      data[field.name] = field.type === "checkbox" ? form.get(field.name) === "on" : form.get(field.name);
    }
    try {
      const response = await fetch("/api/control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: action.operation, data }) });
      const result = (await response.json()) as { ok?: boolean; message?: string; error?: string; invitationLink?: string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Action failed.");
      if (result.invitationLink) setResultLink(result.invitationLink);
      onComplete(result.message ?? "Action completed.");
      if (!result.invitationLink) onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Action failed."); } finally { setBusy(false); }
  }
  return <>
    <button type="button" className={`control-action-scrim ${open ? "is-open" : ""}`} onClick={onClose} aria-label="Close action drawer" tabIndex={open ? 0 : -1} />
    <aside className={`control-action-drawer ${open ? "is-open" : ""}`} aria-hidden={!open} inert={!open} aria-label={action?.title ?? "Profile and session controls"}>
      <header><div><p className="control-eyebrow">{action ? "Action review" : "Administrator session"}</p><h2>{action?.title ?? profileFallback?.actor.displayName ?? "Control Room"}</h2></div><button type="button" onClick={onClose} aria-label="Close"><PanelRightClose /></button></header>
      {action ? <form onSubmit={submit}><div className="control-drawer-body"><p className="control-action-description">{action.description}</p><div className={`control-consequence ${action.destructive ? "control-consequence--danger" : ""}`}><ShieldAlert /><div><strong>Consequence preview</strong><p>{action.consequence}</p></div></div>{action.relatedActions?.length ? <div className="control-related-actions"><strong>Available governed workflows</strong><div>{action.relatedActions.map((related) => <button type="button" key={`${related.operation}-${related.title}`} onClick={() => onSelectAction(related)} className={related.destructive ? "is-destructive" : ""}>{related.title}<ChevronRight /></button>)}</div></div> : null}{action.fields.map((field, index) => <label key={field.name} className={field.type === "checkbox" ? "control-checkbox-field" : "control-form-field"}>{field.type === "checkbox" ? <><input ref={index === 0 ? (firstField as React.RefObject<HTMLInputElement>) : undefined} name={field.name} type="checkbox" defaultChecked={Boolean(field.value)} /><span><strong>{field.label}</strong>{field.hint ? <small>{field.hint}</small> : null}</span></> : <><span>{field.label}{field.required ? " *" : ""}</span>{field.type === "textarea" ? <textarea ref={index === 0 ? (firstField as React.RefObject<HTMLTextAreaElement>) : undefined} name={field.name} required={field.required} defaultValue={String(field.value ?? "")} rows={4} /> : field.type === "select" ? <select ref={index === 0 ? (firstField as React.RefObject<HTMLSelectElement>) : undefined} name={field.name} required={field.required} defaultValue={String(field.value ?? "")}><option value="">Choose…</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input ref={index === 0 ? (firstField as React.RefObject<HTMLInputElement>) : undefined} name={field.name} type={field.type ?? "text"} required={field.required} defaultValue={String(field.value ?? "")} />}{field.hint ? <small>{field.hint}</small> : null}</>}</label>)}{error ? <div className="control-form-error" role="alert"><CircleAlert />{error}</div> : null}{resultLink ? <div className="control-result-link"><strong>Secure fixture link</strong><code>{resultLink}</code><button type="button" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}${resultLink}`)}>Copy link</button><small>No Email or customer contact occurred.</small></div> : null}</div><footer><button type="button" className="control-button control-button--quiet" onClick={onClose}>Cancel</button><button type="submit" className={`control-button ${action.destructive ? "control-button--danger" : "control-button--primary"}`} disabled={busy}>{busy ? <><RefreshCw className="is-spinning" />Applying…</> : action.destructive ? "Confirm consequence" : "Review and apply"}</button></footer></form> : profileFallback ? <div className="control-drawer-body"><div className="control-profile-card"><Avatar name={profileFallback.actor.displayName} imageUrl={profileFallback.actor.imageUrl} size="large" /><h3>{profileFallback.actor.displayName}</h3><p>{profileFallback.actor.email}</p><code>{profileFallback.actor.clerkId}</code><div className="control-pill-stack">{profileFallback.actor.roleNames.map((role) => <StatusPill key={role} value={role} tone="info" />)}</div></div><div className="control-session-facts"><div><span>Identity adapter</span><strong>{sentence(profileFallback.actor.adapter)}</strong></div><div><span>Environment</span><strong>{sentence(profileFallback.actor.environment)}</strong></div><div><span>Permissions</span><strong>{profileFallback.effectivePermissions.filter((entry) => entry.allowed).length} allowed</strong></div></div>{profileFallback.actor.adapter === "local" ? <div className="control-local-switch"><strong>Local fixture identity</strong><p>Switching changes only the deterministic local adapter. It cannot create a production user.</p><div><button type="button" onClick={() => void fetch("/api/control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "identity.switch", data: { identity: "rich" } }) }).then(() => window.location.reload())}>Rich</button><button type="button" onClick={() => void fetch("/api/control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "identity.switch", data: { identity: "daniel" } }) }).then(() => window.location.reload())}>Daniel</button></div></div> : null}</div> : null}
    </aside>
  </>;
}

function CommandPalette({ allowedPermissions, onClose, onNavigate }: { allowedPermissions: Set<string>; onClose: () => void; onNavigate: (result: ReturnType<typeof executeCommand>) => void }) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const commands = CONTROL_COMMANDS.filter((command) => allowedPermissions.has(command.requiredPermission) && `${command.label} ${command.description}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="control-modal-layer" role="dialog" aria-modal="true" aria-label="Command palette"><button className="control-modal-scrim" type="button" onClick={onClose} aria-label="Close command palette" /><section className="control-palette"><header><Command /><input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Navigate or prepare an action…" aria-label="Command" /><kbd>ESC</kbd></header><div>{commands.map((command) => <button type="button" key={command.id} onClick={() => onNavigate(executeCommand(command))}><span className={command.consequential ? "is-action" : ""}>{command.consequential ? <Shield /> : <SquareArrowOutUpRight />}</span><span><strong>{command.label}</strong><small>{command.description}</small></span><kbd>↵</kbd></button>)}</div><footer><span><kbd>↑↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span>Consequential commands only prepare review</span></footer></section></div>;
}

function GlobalSearch({ snapshot, query, setQuery, onClose, onNavigate }: { snapshot: ControlSnapshot; query: string; setQuery: (value: string) => void; onClose: () => void; onNavigate: (section: Section) => void }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const results = useMemo(() => {
    const all = [
      ...snapshot.users.map((user) => ({ id: user.id, type: "User", title: user.displayName, context: `${user.email} ${user.clerkId ?? ""} ${user.roles.map((role) => role.name).join(" ")}`, section: "users" as Section })),
      ...snapshot.businesses.map((business) => ({ id: business.id, type: "Workspace", title: business.name, context: `${business.slug} ${business.workspaceKind} ${business.lifecycleState}`, section: "businesses" as Section })),
      ...snapshot.roles.map((role) => ({ id: role.id, type: "Role", title: role.name, context: `${role.description} ${role.permissions.map((entry) => entry.key).join(" ")}`, section: "roles" as Section })),
      ...snapshot.plans.map((plan) => ({ id: plan.id, type: "Plan", title: plan.name, context: plan.description, section: "entitlements" as Section })),
      ...snapshot.services.map((service) => ({ id: service.id, type: "Service", title: service.name, context: `${service.key} ${service.category}`, section: "entitlements" as Section })),
      ...snapshot.demos.map((demo) => ({ id: demo.id, type: "Demo", title: demo.name, context: `${demo.industryUseCase} ${demo.promotionStatus}`, section: "demo" as Section })),
      ...snapshot.approvals.map((approval) => ({ id: approval.id, type: "Approval", title: sentence(approval.actionKey), context: `${approval.targetType} ${approval.targetId} ${approval.reason}`, section: "audit" as Section })),
      ...snapshot.audit.map((event) => ({ id: event.id, type: "Audit", title: sentence(event.action), context: `${event.correlationId} ${event.resourceType} ${event.resourceId}`, section: "audit" as Section })),
    ];
    const needle = query.trim().toLowerCase();
    return needle ? all.filter((record) => `${record.type} ${record.title} ${record.context}`.toLowerCase().includes(needle)).slice(0, 20) : [];
  }, [query, snapshot]);
  return <div className="control-modal-layer" role="dialog" aria-modal="true" aria-label="Global Control Room search"><button className="control-modal-scrim" type="button" onClick={onClose} aria-label="Close search" /><section className="control-global-search"><header><Search /><input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users, Clerk IDs, businesses, roles, plans, demos, approvals, correlation IDs…" /><button type="button" onClick={onClose}><X /></button></header><div>{query && results.length === 0 ? <div className="control-empty"><Search /><h3>No authorized result</h3><p>Try a name, immutable ID, workspace, permission, service, or audit correlation ID.</p></div> : results.map((result) => <button key={`${result.type}-${result.id}`} type="button" onClick={() => onNavigate(result.section)}><span>{result.type}</span><div><strong>{result.title}</strong><small>{result.context}</small></div><ChevronRight /></button>)}</div></section></div>;
}

function hiddenFields(values: Record<string, string>): ActionField[] {
  return Object.entries(values).map(([name, value]) => ({ name, label: name, value, type: "text" as const, hint: "Resolved from the selected record." }));
}

function simpleReasonAction(operation: string, title: string, consequence: string, values: Record<string, string>, destructive = false): ActionSpec {
  return { operation, title, description: "Provide the operational reason before confirming this governed change.", consequence, destructive, fields: [...hiddenFields(values), { name: "reason", label: "Reason", type: "textarea", required: true, hint: "Stored in append-only platform audit history." }] };
}

function inviteAction(snapshot: ControlSnapshot): ActionSpec {
  return { operation: "invitation.create", title: "Invite administrator", description: "Create a draft or generate a secure local fixture link. This wave never sends Email.", consequence: "Acceptance binds one immutable external identity, applies no more than the invitation scope, and optionally creates a private sandbox.", fields: [{ name: "email", label: "Email", type: "email", required: true }, { name: "displayName", label: "Display name", required: true }, { name: "roleId", label: "Initial platform role", type: "select", required: true, options: snapshot.roles.filter((role) => !role.ownerRole && role.status === "ACTIVE").map((role) => ({ label: role.name, value: role.id })) }, { name: "status", label: "Invitation state", type: "select", required: true, value: "DRAFT", options: [{ label: "Save draft", value: "DRAFT" }, { label: "Generate fixture link (no Email)", value: "SENT" }] }, { name: "environmentScope", label: "Environment scope", type: "select", required: true, value: snapshot.actor.environment, options: [{ label: "Local", value: "local" }, { label: "Staging", value: "staging" }, { label: "Production", value: "production" }] }, { name: "expiresAt", label: "Expiration", type: "datetime-local", required: true, value: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 16) }, { name: "internalNote", label: "Internal note", type: "textarea" }, { name: "requireMfa", label: "Require MFA", type: "checkbox", value: true }, { name: "createSandbox", label: "Create private sandbox on acceptance", type: "checkbox", value: true }, { name: "demoPortfolioAccess", label: "Grant shared Demo Portfolio access", type: "checkbox" }] };
}

function userDetailAction(user: ControlSnapshot["users"][number], snapshot: ControlSnapshot): ActionSpec {
  const lifecycle = user.status === "SUSPENDED"
    ? simpleReasonAction("user.restore_signin", "Restore sign-in", "The user may authenticate again; authorization remains unchanged.", { id: user.id })
    : simpleReasonAction("user.suspend", "Suspend sign-in", "Authentication is blocked while memberships and audit history are preserved.", { id: user.id }, true);
  const archive = user.status === "ARCHIVED"
    ? simpleReasonAction("user.restore_archive", "Restore archived user", "The user returns to active directories with prior authority unchanged.", { id: user.id })
    : simpleReasonAction("user.archive", "Archive user", "Ordinary use is blocked and the record leaves active lists; data is preserved.", { id: user.id }, true);
  const deletion = user.status === "DELETION_SCHEDULED"
    ? simpleReasonAction("user.cancel_deletion", "Cancel user deletion", "The grace-period request is cancelled and sign-in state returns to active.", { id: user.id })
    : simpleReasonAction("user.schedule_deletion", "Schedule user deletion", "New activity is blocked during the governed 30-day grace period.", { id: user.id }, true);
  return { operation: "user.update", title: user.displayName, description: `${user.email} · ${user.clerkId ?? "No immutable external identity bound yet"} · ${user.presence}`, consequence: "Profile fields change. Roles, direct permissions, memberships, sessions, lifecycle, legal controls, support history, and audit remain separate governed records.", relatedActions: [assignRoleToUserAction(user, snapshot), directPermissionAction(user), simpleReasonAction("user.session_revoke_all", "Revoke all sessions", "All active TapConnect platform sessions are revoked.", { id: user.id }, true), simpleReasonAction("user.require_reauthentication", "Require reauthentication", "Every active session must reauthenticate before continuing.", { id: user.id }), lifecycle, archive, deletion, { ...viewAsAction(snapshot), fields: [{ name: "userId", label: "User", value: user.id, required: true }, { name: "reason", label: "Diagnostic reason", type: "textarea", required: true }] }, { ...startSupportAction(snapshot), fields: [{ name: "subjectUserId", label: "Subject user", value: user.id, required: true }, { name: "businessId", label: "Business scope", type: "select", options: user.memberships.map((membership) => ({ label: membership.businessName, value: membership.businessId })) }, { name: "durationMinutes", label: "Duration in minutes", type: "number", value: 30, required: true }, { name: "reason", label: "Support reason", type: "textarea", required: true }] }], fields: [{ name: "id", label: "Internal user ID", value: user.id, required: true }, { name: "displayName", label: "Display name", value: user.displayName, required: true }, { name: "preferredTimezone", label: "Preferred timezone", value: "America/New_York", required: true }, { name: "locale", label: "Locale", value: "en-US", required: true }, { name: "profilePhotoAlt", label: "Profile image alt text", value: user.profilePhotoAlt ?? `${user.displayName} profile` }, { name: "reason", label: "Reason", type: "textarea", required: true, value: "Administrator profile maintenance" }] };
}

function createBusinessAction(snapshot: ControlSnapshot): ActionSpec {
  return { operation: "business.create", title: "Create workspace", description: "Search the directory first. The server rejects a duplicate business name.", consequence: "Creates a distinct tenant record with explicit kind, lifecycle, and plan source. No provider, billing, send, or customer operation occurs.", fields: [{ name: "name", label: "Business or workspace name", required: true }, { name: "workspaceKind", label: "Workspace kind", type: "select", required: true, options: [{ label: "Customer", value: "CUSTOMER" }, { label: "Internal", value: "INTERNAL" }, { label: "Personal sandbox", value: "PERSONAL_SANDBOX" }, { label: "Demo", value: "DEMO" }, { label: "Partner", value: "PARTNER" }] }, { name: "planDefinitionId", label: "Plan", type: "select", options: snapshot.plans.filter((plan) => plan.status === "ACTIVE").map((plan) => ({ label: plan.name, value: plan.id })) }, { name: "reason", label: "Reason and setup decision", type: "textarea", required: true }] };
}

function businessDetailAction(business: ControlSnapshot["businesses"][number], snapshot: ControlSnapshot): ActionSpec {
  const suspension = business.lifecycleState === "SUSPENDED" ? simpleReasonAction("business.restore", "Restore suspended business", "Ordinary workspace access resumes; targeted restrictions remain.", { id: business.id }) : simpleReasonAction("business.suspend", "Suspend business", "All ordinary workspace use is blocked while data is preserved.", { id: business.id }, true);
  const archive = business.lifecycleState === "ARCHIVED" ? simpleReasonAction("business.restore_archive", "Restore archive", "The workspace returns to active use.", { id: business.id }) : simpleReasonAction("business.archive", "Archive workspace", "The workspace leaves active lists and ordinary use is prevented.", { id: business.id }, true);
  const deletion: ActionSpec = business.lifecycleState === "DELETION_SCHEDULED" ? simpleReasonAction("business.cancel_deletion", "Cancel business deletion", "The grace period is cancelled and workspace activity may resume.", { id: business.id }) : { operation: "business.schedule_deletion", title: "Schedule business deletion", description: "Starts the retained grace period; legal hold is checked server-side.", consequence: "New activity is blocked. Permanent destruction remains unavailable without grace completion, recent auth, typed confirmation, and second approval.", destructive: true, fields: [{ name: "id", label: "Business", value: business.id, required: true }, { name: "graceDays", label: "Grace period days", type: "number", value: 30, required: true }, { name: "reason", label: "Reason", type: "textarea", required: true }] };
  const legalHold: ActionSpec = business.legalHold ? simpleReasonAction("business.legal_hold_remove_request", "Request legal-hold removal", "A separate eligible administrator must approve before the hold can be removed.", { id: business.id }) : { operation: "business.legal_hold_place", title: "Place legal hold", description: "Record the preservation authority and reason.", consequence: "All destructive deletion paths are blocked until a separately approved removal.", fields: [{ name: "id", label: "Business", value: business.id, required: true }, { name: "authority", label: "Authority", required: true }, { name: "reason", label: "Reason", type: "textarea", required: true }] };
  return { operation: "business.update", title: business.name, description: `${sentence(business.workspaceKind)} · ${sentence(business.lifecycleState)} · ${business.members.length} members`, consequence: "Updates workspace classification or plan source. Existing content, memberships, restrictions, and audit history remain intact.", relatedActions: [businessMembershipAction(business, snapshot), businessRestrictionAction(business), suspension, archive, deletion, legalHold], fields: [{ name: "id", label: "Business ID", value: business.id, required: true }, { name: "name", label: "Name", value: business.name, required: true }, { name: "workspaceKind", label: "Workspace kind", type: "select", value: business.workspaceKind, options: [{ label: "Customer", value: "CUSTOMER" }, { label: "Internal", value: "INTERNAL" }, { label: "Personal sandbox", value: "PERSONAL_SANDBOX" }, { label: "Demo", value: "DEMO" }, { label: "Partner", value: "PARTNER" }] }, { name: "planDefinitionId", label: "Plan", type: "select", value: business.plan?.id ?? "", options: snapshot.plans.map((plan) => ({ label: plan.name, value: plan.id })) }, { name: "reason", label: "Reason", type: "textarea", required: true }] };
}

function createRoleAction(): ActionSpec {
  return { operation: "role.create", title: "Create platform role", description: "Create a custom role, then add granular permissions through its access inspector.", consequence: "The role starts unassigned. Assignments always require a separate reasoned action.", fields: [{ name: "name", label: "Role name", required: true }, { name: "description", label: "Role description", type: "textarea", required: true }, { name: "reason", label: "Reason for creating role", type: "textarea", required: true }] };
}

function editRoleAction(role: ControlSnapshot["roles"][number]): ActionSpec {
  return {
    operation: "role.update",
    title: `Edit ${role.name}`,
    description:
      "Add or remove granular permission keys. Compare and review the complete list before applying.",
    consequence:
      "Every current assignment immediately resolves through the updated role. Direct denials continue to override its allows.",
    fields: [
      { name: "id", label: "Role ID", value: role.id, required: true },
      { name: "name", label: "Role name", value: role.name, required: true },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        value: role.description,
        required: true,
      },
      {
        name: "permissions",
        label: "Permission keys",
        type: "textarea",
        value: role.permissions.map((entry) => entry.key).join("\n"),
        required: true,
        hint: `One key per line. ${PLATFORM_PERMISSIONS.length} recognized keys.`,
      },
      { name: "reason", label: "Reason", type: "textarea", required: true },
    ],
  };
}

function assignRoleAction(
  role: ControlSnapshot["roles"][number],
  snapshot: ControlSnapshot,
): ActionSpec {
  return {
    operation: "role.assign",
    title: `Assign ${role.name}`,
    description: "Choose an administrator and explicit environment scope.",
    consequence:
      "Effective permissions update immediately. Platform Owner cannot be assigned through this ordinary workflow.",
    fields: [
      {
        name: "userId",
        label: "Administrator",
        type: "select",
        required: true,
        options: snapshot.users.map((user) => ({
          label: `${user.displayName} — ${user.email}`,
          value: user.id,
        })),
      },
      { name: "roleId", label: "Role", value: role.id, required: true },
      {
        name: "environmentScope",
        label: "Environment",
        type: "select",
        value: snapshot.actor.environment,
        required: true,
        options: [
          { label: "Local", value: "local" },
          { label: "Staging", value: "staging" },
          { label: "Production", value: "production" },
        ],
      },
      { name: "reason", label: "Reason", type: "textarea", required: true },
    ],
  };
}

function assignRoleToUserAction(
  user: ControlSnapshot["users"][number],
  snapshot: ControlSnapshot,
): ActionSpec {
  return {
    operation: "role.assign",
    title: "Assign platform role",
    description: `Assign an active non-Owner role to ${user.displayName}.`,
    consequence:
      "Effective access updates immediately within the selected environment; direct denials still win.",
    fields: [
      { name: "userId", label: "User", value: user.id, required: true },
      {
        name: "roleId",
        label: "Role",
        type: "select",
        required: true,
        options: snapshot.roles
          .filter((role) => role.status === "ACTIVE" && !role.ownerRole)
          .map((role) => ({ label: role.name, value: role.id })),
      },
      {
        name: "environmentScope",
        label: "Environment",
        value: snapshot.actor.environment,
        required: true,
      },
      { name: "reason", label: "Reason", type: "textarea", required: true },
    ],
  };
}

function directPermissionAction(
  user: ControlSnapshot["users"][number],
): ActionSpec {
  return {
    operation: "user.permission",
    title: "Grant or deny direct permission",
    description: `Create a source-explained direct rule for ${user.displayName}.`,
    consequence:
      "An explicit DENY overrides every role ALLOW at the matching environment and business scope.",
    fields: [
      { name: "userId", label: "User", value: user.id, required: true },
      {
        name: "permissionKey",
        label: "Permission",
        type: "select",
        required: true,
        options: PLATFORM_PERMISSIONS.map((permission) => ({
          label: permission,
          value: permission,
        })),
      },
      {
        name: "effect",
        label: "Effect",
        type: "select",
        required: true,
        value: "DENY",
        options: [
          { label: "Deny", value: "DENY" },
          { label: "Allow", value: "ALLOW" },
        ],
      },
      { name: "reason", label: "Reason", type: "textarea", required: true },
    ],
  };
}

function businessMembershipAction(
  business: ControlSnapshot["businesses"][number],
  snapshot: ControlSnapshot,
): ActionSpec {
  return {
    operation: "business.member_upsert",
    title: "Add or change business member",
    description: `Manage an explicit membership in ${business.name}.`,
    consequence:
      "Business role changes do not grant platform-wide authority. The only Owner cannot be casually removed.",
    fields: [
      { name: "id", label: "Business", value: business.id, required: true },
      {
        name: "userId",
        label: "User",
        type: "select",
        required: true,
        options: snapshot.users.map((user) => ({
          label: `${user.displayName} — ${user.email}`,
          value: user.id,
        })),
      },
      {
        name: "role",
        label: "Business role",
        type: "select",
        required: true,
        options: [
          { label: "Owner", value: "OWNER" },
          { label: "Manager", value: "MANAGER" },
          { label: "Marketing", value: "MARKETING" },
          { label: "Staff scanner", value: "STAFF_SCANNER" },
          { label: "Viewer", value: "VIEWER" },
        ],
      },
      { name: "reason", label: "Reason", type: "textarea", required: true },
    ],
  };
}

function businessRestrictionAction(
  business: ControlSnapshot["businesses"][number],
): ActionSpec {
  return {
    operation: "business.restrict",
    title: "Restrict selected capability",
    description:
      "Block one capability without suspending the entire business.",
    consequence:
      "The restriction overrides plan and grant access until revoked or expired. The customer-visible explanation remains distinct from the internal note.",
    fields: [
      { name: "id", label: "Business", value: business.id, required: true },
      {
        name: "capability",
        label: "Capability",
        type: "select",
        required: true,
        options: [
          "sign-in",
          "editing",
          "publishing",
          "campaign-send",
          "email-send",
          "tap-point-routing",
          "ai-generation",
          "media-upload",
          "billing-changes",
          "external-integrations",
          "all-service",
        ].map((value) => ({ label: sentence(value), value })),
      },
      {
        name: "customerVisibleExplanation",
        label: "Customer-visible explanation",
        type: "textarea",
        required: true,
      },
      { name: "internalNote", label: "Internal note", type: "textarea" },
      { name: "expiresAt", label: "Optional expiration", type: "datetime-local" },
      { name: "reason", label: "Reason", type: "textarea", required: true },
    ],
  };
}

function cloneRoleAction(role: ControlSnapshot["roles"][number]): ActionSpec {
  return { operation: "role.clone", title: `Clone ${role.name}`, description: "Copies this role’s current permission set into a new unassigned custom role.", consequence: "No user access changes until the cloned role is explicitly assigned.", fields: [{ name: "sourceRoleId", label: "Source role", value: role.id, required: true }, { name: "name", label: "New role name", value: `${role.name} Copy`, required: true }, { name: "description", label: "Description", type: "textarea", value: role.description }, { name: "reason", label: "Reason", type: "textarea", required: true }] };
}

function retireRoleAction(role: ControlSnapshot["roles"][number], snapshot: ControlSnapshot): ActionSpec {
  return { operation: "role.retire", title: `Retire ${role.name}`, description: `${role.users.length} assigned administrator${role.users.length === 1 ? "" : "s"} will be migrated.`, consequence: "The role becomes unavailable for new assignments; every current binding moves to the selected replacement.", destructive: true, fields: [{ name: "id", label: "Role", value: role.id, required: true }, { name: "replacementRoleId", label: "Replacement role", type: "select", required: true, options: snapshot.roles.filter((item) => item.id !== role.id && item.status === "ACTIVE").map((item) => ({ label: item.name, value: item.id })) }, { name: "reason", label: "Reason", type: "textarea", required: true }] };
}

function clonePlanAction(plan: ControlSnapshot["plans"][number]): ActionSpec {
  return { operation: "plan.clone", title: `Clone ${plan.name}`, description: "Copies service entitlements and limits into a new inactive-assignment plan.", consequence: "No business migrates automatically. Existing grandfathered access remains unchanged.", fields: [{ name: "sourcePlanId", label: "Source plan", value: plan.id, required: true }, { name: "name", label: "New plan name", value: `${plan.name} Copy`, required: true }, { name: "description", label: "Description", type: "textarea", value: plan.description }, { name: "reason", label: "Reason", type: "textarea", required: true }] };
}

function grantAction(snapshot: ControlSnapshot): ActionSpec {
  return { operation: "entitlement.override", title: "Grant a service", description: "Create a transparent temporary or permanent manual capability layer.", consequence: "The final result remains subject to service dependencies and active restrictions. Unlimited values require a separate approval.", fields: [{ name: "businessId", label: "Business", type: "select", required: true, options: snapshot.businesses.map((business) => ({ label: business.name, value: business.id })) }, { name: "serviceId", label: "Service", type: "select", required: true, options: snapshot.services.filter((service) => service.status === "ACTIVE").map((service) => ({ label: service.name, value: service.id })) }, { name: "grantKind", label: "Grant kind", type: "select", required: true, value: "temporary", options: [{ label: "Temporary grant", value: "temporary" }, { label: "Permanent internal grant", value: "internal" }, { label: "Demo full access", value: "demo" }, { label: "Complimentary period", value: "complimentary" }, { label: "Beta capability", value: "beta" }] }, { name: "enabled", label: "Enable capability", type: "checkbox", value: true }, { name: "allowance", label: "Optional allowance", type: "number" }, { name: "expiresAt", label: "Expiration", type: "datetime-local" }, { name: "billingImpact", label: "Billing impact", value: "No Stripe mutation; manual internal grant" }, { name: "customerVisibleNote", label: "Customer-visible explanation", type: "textarea" }, { name: "internalNote", label: "Internal note", type: "textarea" }, { name: "reason", label: "Reason", type: "textarea", required: true }] };
}

function startSupportAction(snapshot: ControlSnapshot): ActionSpec {
  return { operation: "support.start", title: "Start Support Session", description: "Select the subject and narrow business scope. The acting administrator remains visible.", consequence: "A permanent banner appears; sensitive actions are blocked; the session expires automatically and each action is audited.", fields: [{ name: "subjectUserId", label: "Subject user", type: "select", required: true, options: snapshot.users.filter((user) => user.id !== snapshot.actor.id).map((user) => ({ label: `${user.displayName} — ${user.email}`, value: user.id })) }, { name: "businessId", label: "Business scope", type: "select", options: snapshot.businesses.map((business) => ({ label: business.name, value: business.id })) }, { name: "durationMinutes", label: "Duration in minutes", type: "number", value: 30, required: true }, { name: "reason", label: "Support reason", type: "textarea", required: true }] };
}

function viewAsAction(snapshot: ControlSnapshot): ActionSpec {
  return { operation: "view_as.start", title: "View as User", description: "Diagnose the user’s effective navigation, workspace access, and entitlement restrictions.", consequence: "No authenticated user session is created. All mutations are blocked until the administrator exits the permanent banner.", fields: [{ name: "userId", label: "User", type: "select", required: true, options: snapshot.users.filter((user) => user.id !== snapshot.actor.id).map((user) => ({ label: `${user.displayName} — ${user.email}`, value: user.id })) }, { name: "reason", label: "Diagnostic reason", type: "textarea", required: true }] };
}

function createDemoAction(): ActionSpec {
  return { operation: "demo.create", title: "Create demo workspace", description: "Creates an isolated demo business, safe Card baseline, Owner membership, and enforced blocked-action policy.", consequence: "No customer data, external sends, money movement, provider writes, or production Tap Point assignment is enabled.", fields: [{ name: "name", label: "Demo name", required: true }, { name: "description", label: "Description", type: "textarea", required: true }, { name: "industryUseCase", label: "Industry / use case", required: true }, { name: "fixtureProvenance", label: "Fixture data provenance", type: "textarea", required: true }, { name: "shared", label: "Create directly in shared portfolio", type: "checkbox" }, { name: "reason", label: "Reason", type: "textarea", required: true }] };
}

function demoDetailAction(demo: ControlSnapshot["demos"][number]): ActionSpec {
  const sourceFields: ActionField[] = [{ name: "sourceDemoId", label: "Source demo", value: demo.id, required: true }, { name: "name", label: "Clone name", value: `${demo.name} Copy`, required: true }, { name: "description", label: "Description", type: "textarea", value: demo.description }, { name: "industryUseCase", label: "Industry / use case", value: demo.industryUseCase }, { name: "fixtureProvenance", label: "Fixture provenance", type: "textarea", value: `Cloned from ${demo.name}: ${demo.fixtureProvenance}` }, { name: "reason", label: "Reason", type: "textarea", required: true }];
  const relatedActions: ActionSpec[] = [];
  if (["DRAFT", "REJECTED"].includes(demo.promotionStatus)) {
    relatedActions.push(simpleReasonAction("demo.submit", "Submit to shared portfolio", "The private demo enters the governed manager review queue.", { id: demo.id }));
  }
  if (demo.promotionStatus === "SUBMITTED") {
    relatedActions.push({
      operation: "demo.review",
      title: "Review portfolio submission",
      description: "Approve promotion to the shared portfolio or record a rejection.",
      consequence: "Approval changes visibility to shared; rejection preserves the private workspace.",
      fields: [
        { name: "id", label: "Demo", value: demo.id, required: true },
        { name: "approved", label: "Approve shared promotion", type: "checkbox", value: true },
        { name: "reason", label: "Review note", type: "textarea", required: true },
      ],
    });
  }
  const rollbackTargets = demo.publications.filter((publication) => publication.id !== demo.currentPublicationId);
  if (rollbackTargets.length) {
    relatedActions.push({
      operation: "demo.rollback",
      title: "Roll back Demo Card revision",
      description: "Select a prior immutable publication revision.",
      consequence: "The demo’s current revision pointer changes; publication history remains intact.",
      fields: [
        { name: "id", label: "Demo", value: demo.id, required: true },
        {
          name: "publicationId",
          label: "Prior revision",
          type: "select",
          required: true,
          options: rollbackTargets.map((publication) => ({
            label: `Revision ${publication.version} — ${publication.status}`,
            value: publication.id,
          })),
        },
        { name: "reason", label: "Rollback reason", type: "textarea", required: true },
      ],
    });
  }
  return { operation: "demo.clone", title: demo.name, description: `${sentence(demo.visibility)} portfolio · ${demo.publications.length} publication revision${demo.publications.length === 1 ? "" : "s"} · Managers: ${demo.managers.join(", ")}`, consequence: "Creates an isolated safe clone with copied Card styling and the complete server-enforced Demo safety block list.", relatedActions, fields: sourceFields };
}

function bindDemoAction(demo: ControlSnapshot["demos"][number], publication: ControlSnapshot["demos"][number]["publications"][number], snapshot: ControlSnapshot): ActionSpec {
  return { operation: "demo.binding.activate", title: `Bind ${demo.name} to landing page`, description: `Prepare published revision v${publication.version} for the permanent public slot contract.`, consequence: "The public cache-safe endpoint changes to this immutable revision. The prior binding is retained for rollback.", fields: [{ name: "demoMetadataId", label: "Demo", value: demo.id, required: true }, { name: "demoPublicationId", label: "Published revision", value: publication.id, required: true }, { name: "slotKey", label: "Landing slot key", value: snapshot.configuration.find((setting) => setting.key === "landing.demo_slot_key")?.value ?? "primary-card", required: true }, { name: "requireApproval", label: "Require a second administrator approval", type: "checkbox" }, { name: "reason", label: "Publication reason", type: "textarea", required: true }] };
}

function approvalAction(approval: ControlSnapshot["approvals"][number], approved: boolean): ActionSpec {
  return { operation: "approval.decide", title: `${approved ? "Approve" : "Reject"} ${sentence(approval.actionKey)}`, description: `${approval.reason} Target: ${approval.targetType} ${approval.targetId}.`, consequence: approved ? "Approval authorizes the governed application step; it does not bypass its final validation." : "The requested sensitive action remains blocked.", destructive: !approved, fields: [{ name: "id", label: "Approval request", value: approval.id, required: true }, { name: "approved", label: "Approved", type: "checkbox", value: approved }, { name: "reason", label: "Decision note", type: "textarea", required: true }] };
}

function configurationAction(setting: ControlSnapshot["configuration"][number]): ActionSpec {
  return { operation: "configuration.update", title: `Edit ${setting.key}`, description: setting.description, consequence: "The new non-secret value becomes the Control Room policy default. The prior value remains in append-only audit history.", fields: [{ name: "key", label: "Setting key", value: setting.key, required: true }, { name: "value", label: "Value", value: setting.value, required: true }, { name: "description", label: "Description", value: setting.description, required: true }, { name: "reason", label: "Reason", type: "textarea", required: true }] };
}

function preparedAction(action: string, snapshot: ControlSnapshot): ActionSpec {
  if (action === "invite-administrator") return inviteAction(snapshot);
  if (action === "create-demo") return createDemoAction();
  return grantAction(snapshot);
}
