"use client";

import { useEffect, useRef, useState } from "react";

export const STEPS = [
  { id: "input", label: "Input" },
  { id: "data", label: "Data" },
  { id: "decomposition", label: "Decomposition" },
  { id: "statistics", label: "Statistics" },
  { id: "verdict", label: "Verdict" },
];

export function Rail({ container }: { container: React.RefObject<HTMLDivElement> }) {
  const [active, setActive] = useState(1);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-step]"));
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = root.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.max(0, Math.min(1, (vh * 0.5 - box.top) / box.height));
      if (bar.current) bar.current.style.transform = `scaleY(${progress})`;
      let current = 1;
      for (const s of sections) if (s.getBoundingClientRect().top < vh * 0.5) current = Number(s.dataset.step);
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [container]);

  return (
    <aside aria-label="Steps" className="sticky top-10 hidden h-[calc(100vh-80px)] flex-col lg:flex">
      <div className="relative h-[120px]" aria-live="polite">
        {STEPS.map((s, i) => (
          <span
            key={s.id}
            aria-hidden={active !== i + 1}
            className="rail-num absolute left-0 top-0 font-serif text-[120px] leading-none text-text tnum"
            style={{ opacity: active === i + 1 ? 1 : 0, transform: `translateY(${(i + 1 - active) * 24}px)` }}
          >
            {i + 1}
          </span>
        ))}
      </div>
      <div className="mt-8 flex flex-1 gap-5">
        <div className="relative w-px bg-rule">
          <div ref={bar} className="absolute inset-0 origin-top bg-text" style={{ transform: "scaleY(0)" }} />
        </div>
        <ol className="flex flex-col gap-5 pt-1">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className={`group flex items-baseline gap-3 text-[14px] transition-colors ${active === i + 1 ? "text-text" : "text-muted hover:text-text"}`}>
                <span className="tnum text-[12px]">0{i + 1}</span>
                <span className="transition-transform duration-200 group-hover:translate-x-1">{s.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
