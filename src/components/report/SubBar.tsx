import Link from "next/link";

export function SubBar({ code, period, partial, today, cardHref, source }: { code: string; period: string | null; partial: string; today: string; cardHref: string | null; source: string }) {
  return (
    <div className="border-b border-rule">
      <div className="mx-auto grid min-h-[54px] max-w-canvas grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-2 md:px-side lg:grid-cols-[1fr_auto_1fr]">
        <p className="text-[13.5px] font-semibold text-text">Report No. {code}</p>
        <p className="order-3 col-span-2 text-[13px] text-muted lg:order-none lg:col-span-1 lg:text-center">
          {source} · {period ?? "loading the years"} · generated{" "}
          <span suppressHydrationWarning>{today}</span>
          {partial && <span className="block text-[12px]">{partial}</span>}
        </p>
        <div className="flex items-center justify-end gap-4">
          {cardHref && (
            <Link href={cardHref} className="inline-flex h-[36px] items-center rounded-full border border-highlight-border px-4 text-[13.5px] font-medium text-text transition-colors hover:bg-highlight">
              Create share card
            </Link>
          )}
          <Link href="/" className="text-[13.5px] text-muted hover:text-text">
            New search
          </Link>
        </div>
      </div>
    </div>
  );
}
