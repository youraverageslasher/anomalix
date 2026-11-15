"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/report", label: "Report" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/sources", label: "Sources" },
  { href: "/states", label: "Brazil Grid" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Masthead() {
  const pathname = usePathname() ?? "/";
  return (
    <header className="w-full border-b border-rule">
      <div className="h-[5px] w-full bg-text" aria-hidden />
      <div className="mx-auto grid w-full max-w-canvas grid-cols-[1fr_auto] items-center gap-x-6 px-5 pt-4 lg:h-[74px] lg:pt-0 md:px-side lg:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="group flex items-baseline gap-3" aria-label="Anomalix, Climate Detective, home">
          <span className="font-serif text-[27px] font-semibold leading-none tracking-[-0.01em] text-text transition-opacity group-hover:opacity-80">
            Anomalix
          </span>
          <span className="hidden text-[14.5px] text-muted sm:inline">Climate Detective</span>
        </Link>

        <nav aria-label="Main" className="order-3 col-span-2 -mx-5 overflow-x-auto px-5 lg:order-none lg:col-span-1 lg:mx-0 lg:px-0">
          <ul className="flex h-[48px] items-stretch gap-3 sm:gap-7 lg:h-[74px]">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className="flex">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center whitespace-nowrap text-[13.5px] transition-colors sm:text-[14.5px] ${
                      active ? "text-text" : "text-muted hover:text-text"
                    }`}
                  >
                    {item.label}
                    <span
                      aria-hidden
                      className={`absolute inset-x-0 bottom-0 h-[2px] origin-left bg-text transition-transform duration-300 ${
                        active ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <p className="justify-self-end text-[13px] text-muted lg:text-[14.5px]">NASA Space Apps 2026</p>
      </div>
    </header>
  );
}
