import Link from "next/link";
import { ShieldX } from "lucide-react";
import "../control-room.css";

export default function ControlUnauthorizedPage() {
  return (
    <main className="control-unauthorized">
      <div className="control-unauthorized-mark" aria-hidden="true">
        <ShieldX />
      </div>
      <p className="control-eyebrow">Protected internal application</p>
      <h1>Control Room access is not assigned.</h1>
      <p>
        Authentication identifies you, but TapConnect has not granted this identity
        the required platform role and environment scope.
      </p>
      <Link href="/dashboard">Return to Studio</Link>
    </main>
  );
}

