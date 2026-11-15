import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const BASE =
  "inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-text px-7 text-[15px] font-semibold text-bg transition-[background-color,transform] duration-200 hover:bg-white active:scale-[0.98] disabled:opacity-60";

export function Button({ children, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button className={`${BASE} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`${BASE} ${className}`}>
      {children}
    </Link>
  );
}
