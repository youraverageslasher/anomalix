import { ButtonLink } from "@/components/ui/Button";

export const metadata = { title: "Not found · Anomalix" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-canvas flex-col justify-center gap-6 px-5 md:px-side">
      <div className="flex gap-2" aria-hidden>
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className={`h-2 w-2 rounded-full ${i === 4 ? "bg-signal" : "bg-dot-dark"}`} />
        ))}
      </div>
      <p className="label text-muted">404 · NO DATA AT THIS POINT</p>
      <h1 className="font-serif text-[48px] font-medium leading-none tracking-[-0.02em] text-text md:text-[64px]">Nothing measured here.</h1>
      <p className="max-w-[480px] text-[17px] leading-relaxed text-body">This address does not exist. We would rather say so than invent a page. City search still works.</p>
      <div>
        <ButtonLink href="/">Back to start</ButtonLink>
      </div>
    </main>
  );
}
