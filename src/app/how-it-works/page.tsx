import { Suspense } from "react";
import { MethodPage } from "@/components/method/MethodPage";

export const metadata = {
  title: "How it works · Anomalix",
  description: "Where on Earth is global warming already breaking through natural weather noise, and how is the local Earth system responding? The five steps from NASA data to an honest verdict.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <MethodPage />
    </Suspense>
  );
}
