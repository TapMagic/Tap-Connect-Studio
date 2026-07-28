import { redirect } from "next/navigation";

/** Public pricing stub — commercial journey owns offer Cards, not raw Stripe. */
export default function PricingPage() {
  redirect("/#offers");
}
