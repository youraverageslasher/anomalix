import { describe, expect, it } from "vitest";
import { bandFor, parseZonal } from "@/lib/data/zonal";

/* Header copied from the real file; the rows are synthetic test values, never shown in the UI. */
const HEAD = "Year,Glob,NHem,SHem,24N-90N,24S-24N,90S-24S,64N-90N,44N-64N,24N-44N,EQU-24N,24S-EQU,44S-24S,64S-44S,90S-64S";
const row = (y: number, v: string) => `${y},${Array(14).fill(v).join(",")}`;

describe("GISTEMP zonal bands", () => {
  it("reads the header on line 1 and skips years with ***", () => {
    const z = parseZonal([HEAD, row(2000, ".10"), row(2001, "***"), row(2002, ".30")].join("\n"))!;
    expect([z.firstYear, z.lastYear]).toEqual([2000, 2002]);
    expect(z.bands["24S-EQU"].map((p) => p.year)).toEqual([2000, 2002]);
    expect(Object.keys(z.bands)).toHaveLength(8);
  });
  it("rejects a file without the expected header", () => {
    expect(parseZonal("Land-Ocean\n1,2,3")).toBeNull();
  });
  it("picks the narrow band by latitude", () => {
    expect(bandFor(-20.8)).toBe("24S-EQU");
    expect(bandFor(28.6)).toBe("24N-44N");
    expect(bandFor(78.2)).toBe("64N-90N");
    expect(bandFor(-70)).toBe("90S-64S");
    expect(bandFor(0)).toBe("EQU-24N");
    expect(bandFor(95)).toBeNull();
  });
});
