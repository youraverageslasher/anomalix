"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pill } from "@/components/ui/Pill";
import { useHomeSpan } from "./useCompare";
import { SearchPill } from "@/components/ui/SearchPill";
import { DotGlobe } from "@/components/v6/DotGlobe";
import { GLOBAL_REPORT_HREF } from "@/lib/geo";
import { CaseCards } from "./CaseCards";

export function HeroSearch({ stateValues }: { stateValues: Record<string, number> }) {
  const span = useHomeSpan();
  const [globe, setGlobe] = useState(0);
  useEffect(() => {
    const set = () => setGlobe(window.innerWidth >= 768 ? Math.min(760, Math.round(window.innerWidth * 0.62)) : 0);
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const id = w.requestIdleCallback ? w.requestIdleCallback(set, { timeout: 1500 }) : window.setTimeout(set, 600);
    window.addEventListener("resize", set);
    return () => {
      window.removeEventListener("resize", set);
      if (!w.requestIdleCallback) window.clearTimeout(id);
    };
  }, []);

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {globe > 0 && (
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[40px] -z-10 -translate-x-1/2 opacity-[0.28]">
          <DotGlobe size={globe} stateValues={stateValues} degreesPerSecond={2.2} ariaLabel="" />
        </div>
      )}
      <div className="mx-auto flex max-w-canvas flex-col items-center px-5 pb-10 pt-14 text-center md:px-side md:pt-20">
        <Pill>{span ? `NASA POWER · GISTEMP v4 · ${span.from}-${span.to}` : "NASA POWER · GISTEMP v4"}</Pill>
        <h1 id="hero-title" className="mt-7 max-w-[1100px] text-balance font-serif text-[44px] font-medium leading-[1.02] tracking-[-0.03em] text-text md:text-[76px] xl:text-[88px]">
          Is your city&apos;s climate actually shifting, or is it just natural noise?
        </h1>
        <p className="mt-7 max-w-[640px] text-[19px] leading-[1.6] text-body">
          Type any city on Earth. In seconds you get its warming trend, the margin of error and a significance test,
          computed from {span ? `${span.n} years` : "decades"} of NASA measurements. When the signal is not there, we tell you.
        </p>
        <div className="mt-9 flex w-full justify-center">
          <SearchPill placeholder="City name or coordinates" />
        </div>
        <CaseCards />
        <p className="mt-4 text-[14px] text-muted">
          Or open the{" "}
          <Link href={GLOBAL_REPORT_HREF} className="try-chip text-body underline decoration-rule underline-offset-4 hover:text-text hover:decoration-text">
            Global
          </Link>{" "}
          record.
        </p>
      </div>
    </section>
  );
}
