"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [pending, setPending] = useState(false);

  async function refresh() {
    const res = await fetch("/api/commerce?view=orders");
    const data = await res.json();
    if (data.ok) setOrders(data.orders);
  }

  async function createDemoDraft() {
    setPending(true);
    setMessage(null);
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

  async function mockCheckout(orderId: string) {
    setPending(true);
    setMessage(null);
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
        }),
      }).then((r) => r.json());
      if (!paid.ok) {
        setMessage(paid.error ?? "Complete failed");
        return;
      }
      setMessage(`Paid via mock session ${session.session.id} (no card data stored)`);
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
        <Badge variant="outline" className="text-[10px] uppercase">
          Mock · business {businessId.slice(0, 8)}
        </Badge>
      </div>
      {message ? <p className="text-sm text-primary">{message}</p> : null}

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
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={order.status === "paid" ? "default" : "outline"}
                  className={order.status === "paid" ? "bg-primary" : ""}
                >
                  {order.status}
                </Badge>
                {(order.status === "draft" || order.status === "pending") && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending || order.lines.length === 0}
                    onClick={() => void mockCheckout(order.id)}
                  >
                    Mock pay
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
