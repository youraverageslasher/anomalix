"use client";

import type { ReactNode } from "react";
import { useInView } from "@/components/v6/motion";

export function StepShell({
  n,
  id,
  kicker,
  title,
  children,
  visual,
  flip = false,
}: {
  n: number;
  id: string;
  kicker: string;
  title: string;
  children: ReactNode;
  visual: ReactNode;
  flip?: boolean;
}) {
  const { ref, inView } = useInView<HTMLElement>({ rootMargin: "0px 0px -20% 0px" });
  return (
    <section
      ref={ref}
      id={id}
      data-step={n}
      aria-labelledby={`${id}-title`}
      className={`method-step scroll-mt-24 border-t border-rule py-16 first:border-t-0 md:py-24 ${inView ? "is-in" : ""}`}
    >
      <div className={`grid grid-cols-1 items-center gap-10 xl:gap-16 ${flip ? "xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]" : "xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]"}`}>
        <div className={`method-copy ${flip ? "xl:order-2" : ""}`}>
          <div className="flex items-baseline gap-4 lg:hidden">
            <span className="font-serif text-[64px] leading-none text-text tnum">{n}</span>
          </div>
          <p className="label mt-2 lg:mt-0">{kicker}</p>
          <h2 id={`${id}-title`} className="mt-4 font-serif text-[34px] font-medium leading-[1.08] tracking-[-0.02em] text-text md:text-[44px]">
            {title}
          </h2>
          <div className="mt-6 flex flex-col gap-4 text-bodyl text-body">{children}</div>
        </div>
        <div className={`method-visual min-w-0 ${flip ? "xl:order-1" : ""}`}>{visual}</div>
      </div>
    </section>
  );
}
