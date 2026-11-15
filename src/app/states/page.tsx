import { Suspense } from "react";
import { StatesPage } from "@/components/states/StatesPage";

export const metadata = { title: "Brazil Grid · Anomalix" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <StatesPage />
    </Suspense>
  );
}
