import { Suspense } from "react";
import { CardView } from "./CardView";

export const metadata = { title: "Share card · Anomalix" };

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={null}>
        <CardView />
      </Suspense>
    </div>
  );
}
