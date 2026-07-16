import { redirect } from "next/navigation";

/** Dedicated pricing URL → landing comparison chart */
export default function PricingPage() {
  redirect("/#compare");
}
