import type { ReactNode } from "react";

/* Text is passed already in capitals so tokens like "v4" and "p" keep their case. */
export function Pill({
  children,
  variant = "default",
  className = "",
}: {
  children: ReactNode;
  variant?: "default" | "light";
  className?: string;
}) {
  const look =
    variant === "light"
      ? "bg-text text-bg border border-text"
      : "bg-card text-body border border-rule";
  return (
    <span
      className={`inline-flex h-[30px] items-center rounded-full px-[14px] text-[12.5px] font-semibold tracking-[0.06em] ${look} ${className}`}
    >
      {children}
    </span>
  );
}
