export function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 w-full max-w-canvas px-5 pb-10 md:px-side">
      <div className="flex flex-col gap-2 border-t border-rule pt-6 text-[12.5px] text-muted md:flex-row md:justify-between">
        <p>Anomalix · Climate Detective · NASA Space Apps Challenge 2026</p>
        <p>Data: NASA POWER (MERRA-2) · NASA GISS GISTEMP v4</p>
      </div>
    </footer>
  );
}
