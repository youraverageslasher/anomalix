import { Suspense } from "react";
import { ReportPage } from "@/components/report/ReportPage";

export const metadata = { title: "Report · Anomalix" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ReportPage />
    </Suspense>
  );
}
