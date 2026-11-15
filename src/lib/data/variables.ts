/* The four NASA POWER monthly variables the app can analyze. Temperature is the default everywhere. */
export type VariableCode = "T2M" | "PRECTOTCORR" | "RH2M" | "WS2M";

export interface VariableInfo {
  code: VariableCode;
  name: string;
  short: string;
  unit: string;
  /* Decimals used for slopes and intervals in this unit. */
  digits: number;
  up: string;
  down: string;
  temperature: boolean;
}

export const VARIABLES: Record<VariableCode, VariableInfo> = {
  T2M: { code: "T2M", name: "Air temperature at 2 m", short: "Temperature", unit: "°C", digits: 2, up: "Warming", down: "Cooling", temperature: true },
  PRECTOTCORR: { code: "PRECTOTCORR", name: "Precipitation", short: "Precipitation", unit: "mm/day", digits: 3, up: "Increasing", down: "Decreasing", temperature: false },
  RH2M: { code: "RH2M", name: "Relative humidity at 2 m", short: "Humidity", unit: "%", digits: 2, up: "Increasing", down: "Decreasing", temperature: false },
  WS2M: { code: "WS2M", name: "Wind speed at 2 m", short: "Wind speed", unit: "m/s", digits: 3, up: "Increasing", down: "Decreasing", temperature: false },
};

export const VARIABLE_CODES = Object.keys(VARIABLES) as VariableCode[];
export const DEFAULT_VARIABLE: VariableCode = "T2M";

export function isVariable(v: string | null | undefined): v is VariableCode {
  return !!v && (VARIABLE_CODES as string[]).includes(v);
}

export function readVariable(v: string | null | undefined): VariableCode {
  const up = v?.toUpperCase();
  return isVariable(up) ? up : DEFAULT_VARIABLE;
}

export function perDecadeUnit(code: VariableCode): string {
  return `${VARIABLES[code].unit} per decade`;
}

export function directionWord(code: VariableCode, dir: "up" | "down"): string {
  return dir === "up" ? VARIABLES[code].up : VARIABLES[code].down;
}

/* Neutral series color for every variable that is not temperature: the blue to red ramp means temperature only. */
export const NEUTRAL_SERIES = "#B3BBC7";
