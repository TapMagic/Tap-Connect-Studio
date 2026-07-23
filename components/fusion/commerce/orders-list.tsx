"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CommerceOrder } from "@/lib/fusion/commerce";

function formatMoney(cents: number, currency = "usd"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

type WireSummary = {
  timelineEventId: string | null;
  loyaltyAwardStubId: string | null;
  evidenceId: string | null;
  outboxTopics: string[];
};

export function CommerceOrdersPanel({
  businessId,
  featureEnabled,
  initialOrders,
}: {
  businessId: string;
  featureEnabled: boolean;
  initialOrders: CommerceOrder[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [message, setMessage] = useState<string | null>(null);
  const [wireSummary, setWireSummary] = useState<WireSummary | null>(null);
  const [pending, setPending] = useState(false);
  const [relationshipId, setRelationshipId] = useState("");
  const [contactId, setContactId] = useState("");
  const [awardLoyalty, setAwardLoyalty] = useState(false);

  async function refresh() {
    const res = await fetch("/api/commerce?view=orders");
    const data = await res.json();
    if (data.ok) setOrders(data.orders);
  }

  async function createDemoDraft() {
    setPending(true);
    setMessage(null);
    setWireSummary(null);
    try {
      await fetch("/api/commerce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_catalog" }),
      });
      const catalog = await fetch("/api/commerce?view=catalog").then((r) => r.json());
      const itemId = catalog.items?.[0]?.id as string | undefined;
      if (!itemId) {
        setMessage("No catalog items");
        return;
      }
      const draft = await fetch("/api/commerce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_draft",
          lines: [{ itemId, quantity: 1 }],
          relationshipId: relationshipId.trim() || undefined,
        }),
      }).then((r) => r.json());
      if (!draft.ok) {
        setMessage(draft.error ?? "Draft failed");
        return;
      }
      setMessage(`Draft ${draft.order.id} · ${formatMoney(draft.order.totalCents)}`);
      await refresh();
    } finally {
      setPending(false);
    }
  }

  async function orderAction(
    action: "cancel_order" | "fulfill_order" | "refund_order",
    orderId: string,
    reason?: string
  ) {
    setPending(true);
    setMessage(null);
    setWireSummary(null);
    try {
      const res = await fetch("/api/commerce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, orderId, reason }),
      }).then((r) => r.json());
      if (!res.ok) {
        setMessage(res.error ?? `${action} failed`);
        return;
      }
      if (action === "refund_order") {
        setMessage(`Refunded · mock ref ${res.refundRef}`);
      } else if (action === "cancel_order") {
        setMessage(`Canceled ${orderId}`);
      } else {
        setMessage(`Fulfilled ${orderId}`);
      }
      await refresh();
    } finally {
      setPending(false);
    }
  }

  async function mockCheckout(orderId: string, orderRelationshipId?: string) {
    setPending(true);
    setMessage(null);
    setWireSummary(null);
    try {
      const session = await fetch("/api/commerce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkout", orderId }),
      }).then((r) => r.json());
      if (!session.ok) {
        setMessage(session.error ?? "Checkout failed");
        return;
      }
      const paid = await fetch("/api/commerce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_checkout",
          sessionId: session.session.id,
          relationshipId: relationshipId.trim() || orderRelationshipId,
          contactId: contactId.trim() || undefined,
          awardLoyalty,
        }),
      }).then((r) => r.json());
      if (!paid.ok) {
        setMessage(paid.error ?? "Complete failed");
        return;
      }
      setMessage(`Paid via mock session ${session.session.id} · payment ref stored (no card data)`);
      if (paid.wire) {
        setWireSummary(paid.wire as WireSummary);
      }
      await refresh();
    } finally {
      setPending(false);
    }
  }

  if (!featureEnabled) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/40 p-6">
        <p className="font-medium">TapCommerce is off</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Enable <code className="font-mono text-xs">commerce.tapcommerce</code> in Platform Admin
          to manage mock orders. Payments stay provider-hosted — never raw card data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-card/80 to-black/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Relationship wire</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Link mock checkout to a relationship for timeline + optional TapLoop award stub. Evidence
          surfaces on Insights with modeled provenance.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input
            placeholder="Relationship ID (optional)"
            value={relationshipId}
            onChange={(e) => setRelationshipId(e.target.value)}
            className="border-border/60 bg-black/30 font-mono text-xs"
          />
          <Input
            placeholder="Contact ID (optional)"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            className="border-border/60 bg-black/30 font-mono text-xs"
          />
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={awardLoyalty}
            onChange={(e) => setAwardLoyalty(e.target.checked)}
            className="accent-primary"
          />
          <span>Enqueue TapLoop loyalty award stub on pay</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => void createDemoDraft()}>
          New mock draft
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => void refresh()}
        >
          Refresh
        </Button>
        <Badge variant="outline" className="border-primary/40 text-[10px] uppercase text-primary">
          Mock · business {businessId.slice(0, 8)}
        </Badge>
      </div>
      {message ? <p className="text-sm text-primary">{message}</p> : null}

      {wireSummary ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-medium text-primary">Wired to Relationship → Insights</p>
          <ul className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
            <li>
              Timeline: {wireSummary.timelineEventId ?? "— (needs relationship + contact)"}
            </li>
            <li>Loyalty stub: {wireSummary.loyaltyAwardStubId ?? "—"}</li>
            <li>Evidence: {wireSummary.evidenceId ?? "—"}</li>
            <li>Outbox: {wireSummary.outboxTopics.join(", ") || "—"}</li>
          </ul>
          {wireSummary.evidenceId ? (
            <p className="mt-2 text-xs text-muted-foreground">
              View commerce KPIs on{" "}
              <a href="/dashboard/insights" className="text-primary underline-offset-4 hover:underline">
                Insights
              </a>
              .
            </p>
          ) : null}
        </div>
      ) : null}

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No orders yet. Create a draft to exercise line items, totals, and mock checkout.
        </p>
      ) : (
        <ul className="divide-y divide-border/40 rounded-xl border border-border/60 bg-card/40">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="font-mono text-xs text-muted-foreground">{order.id}</p>
                {order.relationshipId ? (
                  <p className="font-mono text-[10px] text-primary/80">
                    rel {order.relationshipId.slice(0, 16)}…
                  </p>
                ) : null}
                <p className="text-sm">
                  {order.lines.map((l) => `${l.quantity}× ${l.name}`).join(", ") || "Empty"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Subtotal {formatMoney(order.subtotalCents, order.currency)}
                  {order.taxCents > 0
                    ? ` · tax ${formatMoney(order.taxCents, order.currency)}`
                    : ""}{" "}
                  · total {formatMoney(order.totalCents, order.currency)}
                </p>
                {order.paymentRef ? (
                  <p className="mt-0.5 font-mono text-[10px] text-primary/70">
                    Payment ref {order.paymentRef}
                  </p>
                ) : null}
                {order.refundRef ? (
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    Refund {order.refundRef}
                  </p>
                ) : null}
                {order.cancelReason && order.status === "canceled" ? (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{order.cancelReason}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge
                  variant={
                    order.status === "paid" || order.status === "fulfilled"
                      ? "default"
                      : "outline"
                  }
                  className={
                    order.status === "paid" || order.status === "fulfilled"
                      ? "bg-primary text-primary-foreground"
                      : ""
                  }
                >
                  {order.status}
                </Badge>
                {(order.status === "draft" || order.status === "pending") && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending || order.lines.length === 0}
                      onClick={() => void mockCheckout(order.id, order.relationshipId)}
                    >
                      Mock pay
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => void orderAction("cancel_order", order.id, "Canceled in Studio")}
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {order.status === "paid" && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => void orderAction("fulfill_order", order.id)}
                    >
                      Fulfill
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => void orderAction("refund_order", order.id, "Mock refund")}
                    >
                      Refund
                    </Button>
                  </>
                )}
                {order.status === "fulfilled" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => void orderAction("refund_order", order.id, "Mock refund")}
                  >
                    Refund
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
