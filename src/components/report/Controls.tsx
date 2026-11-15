"use client";

import { CITY_MIN, GLOBAL_MIN, MAX_YEAR, MIN_SPAN, SEASONS, type ReportParams } from "./params";
import type { Season } from "@/lib/data/types";
import { VARIABLES, VARIABLE_CODES, type VariableCode } from "@/lib/data/variables";

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="label">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

const SELECT =
  "h-[38px] cursor-pointer appearance-none rounded-full border border-rule bg-field pl-4 pr-9 text-[14px] text-text transition-colors hover:border-highlight-border focus-visible:border-text";

function Select({ value, onChange, label, children, disabled = false }: { value: string; onChange: (v: string) => void; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <span className="relative inline-flex" title={disabled ? "Global uses GISTEMP, which measures temperature only" : undefined}>
      <select aria-label={label} className={`${SELECT} disabled:cursor-not-allowed disabled:opacity-60`} value={value} disabled={disabled} aria-describedby={disabled ? "variable-note" : undefined} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted">
        ▾
      </span>
    </span>
  );
}

export function Controls({ p, update }: { p: ReportParams; update: (patch: Partial<ReportParams>) => void }) {
  const min = p.global ? GLOBAL_MIN : CITY_MIN;
  const years = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const canCity = Number.isFinite(p.lat) && Number.isFinite(p.lon);

  return (
    <section aria-label="Report controls" className="mx-auto mt-6 max-w-canvas px-5 md:px-side">
      <div className="flex flex-col gap-6 rounded-[16px] border border-rule bg-card p-[22px] shadow-card lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-x-7 gap-y-5">
          <Group label="Variable">
            <Select label="Variable" value={p.variable} onChange={(v) => update({ variable: v as VariableCode })} disabled={p.global}>
              {VARIABLE_CODES.map((c) => (
                <option key={c} value={c} disabled={p.global && c !== "T2M"}>
                  {VARIABLES[c].name} ({VARIABLES[c].unit})
                </option>
              ))}
            </Select>
            {p.global && (
              <span id="variable-note" className="max-w-[220px] text-[12px] leading-snug text-muted">
                Global uses GISTEMP, which measures temperature only.
              </span>
            )}
          </Group>
          <Group label="Region">
            <div role="radiogroup" aria-label="Region" className="inline-flex rounded-full border border-rule bg-field p-[3px]">
              {canCity && (
                <button
                  role="radio"
                  aria-checked={!p.global}
                  onClick={() => update({ global: false, from: Math.max(CITY_MIN, p.from) })}
                  className={`h-[30px] max-w-[200px] truncate rounded-full sm:max-w-[240px] px-4 text-[13.5px] transition-colors ${!p.global ? "bg-text text-bg" : "text-body hover:text-text"}`}
                >
                  {p.cityName || "This place"}
                </button>
              )}
              <button
                role="radio"
                aria-checked={p.global}
                onClick={() => update({ global: true })}
                className={`h-[30px] rounded-full px-4 text-[13.5px] transition-colors ${p.global ? "bg-text text-bg" : "text-body hover:text-text"}`}
              >
                Global
              </button>
            </div>
          </Group>
          <Group label="Period">
            <Select label="First year" value={String(p.from)} onChange={(v) => update({ from: Number(v) })}>
              {years(min, p.to - MIN_SPAN + 1).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
            <span className="text-[14px] text-muted">to</span>
            <Select label="Last year" value={String(p.to)} onChange={(v) => update({ to: Number(v) })}>
              {years(p.from + MIN_SPAN - 1, MAX_YEAR).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </Group>
          <Group label="Season">
            <Select label="Season" value={p.season} onChange={(v) => update({ season: v as Season })}>
              {SEASONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Group>
        </div>
        <p className="max-w-[190px] text-[13px] leading-snug text-muted">
          Pick a variable, period and season. Every number on this page recomputes live from NASA data.
        </p>
      </div>
    </section>
  );
}
