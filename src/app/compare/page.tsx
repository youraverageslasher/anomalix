import { Suspense } from "react";
import { ComparePage } from "@/components/compare/ComparePage";

export const metadata = { title: "Compare · Anomalix" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ComparePage />
    </Suspense>
  );
}
