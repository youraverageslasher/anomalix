import { Suspense } from "react";
import { SourcesPage } from "@/components/sources/SourcesPage";

export const metadata = { title: "Sources · Anomalix" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SourcesPage />
    </Suspense>
  );
}
