import { redirect } from "next/navigation";

/** Canonical field entry — prefer dashboard shell with auth + feature gate. */
export default function PulseRootRedirect() {
  redirect("/dashboard/pulse");
}
