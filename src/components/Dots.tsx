export function LoadingDots({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-3">
      <span className="dots flex gap-1.5" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <span className="text-[12px] font-semibold tracking-[0.14em] text-muted">{label}</span>
    </div>
  );
}
