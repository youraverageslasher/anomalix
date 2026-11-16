# Anomalix · Climate Detective

NASA Space Apps Challenge 2026, challenge "Be an Earth System Trend Detective".

Type a city, or pick Global, and get an honest verdict on the trend of air temperature, precipitation, relative humidity or wind speed (NASA POWER, MERRA-2 based, monthly): an OLS slope with its 95% margin of error and regression p value, a Mann-Kendall second check (Z, p, Sen's slope) and a confidence seal (High, Medium or Inconclusive). When the two methods disagree, the verdict is Inconclusive. Global, the Brazil map and the Brazil Grid page are temperature only. A "Two sources" figure sets the local NASA POWER (MERRA-2 reanalysis) temperature trend beside the global NASA GISTEMP v4 (station based) trend on the same years: a comparison with a different method, not a validation of the local number. The local to global rate ratio is shown only when the local trend is significant. City and global reports are computed live from public NASA data (GISTEMP falls back to a dated built-in snapshot if the live file is unreachable). The Brazil grid and decade pages are precomputed from NASA POWER at build time and shipped as data files.

## Data
- NASA POWER monthly point API (MERRA-2 based), parameters T2M, PRECTOTCORR, RH2M and WS2M, community RE: https://power.larc.nasa.gov/api/temporal/monthly/point
- NASA GISS GISTEMP v4 global monthly and annual means: https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv
- NASA GISS GISTEMP v4 zonal annual means: https://data.giss.nasa.gov/gistemp/tabledata_v4/ZonAnn.Ts+dSST.csv
- NASA Worldview links (no data is fetched): https://worldview.earthdata.nasa.gov/
- Open-Meteo geocoding: https://geocoding-api.open-meteo.com/v1/search

No period is typed into the app. Every year range shown (report, share card, CSV, captions, alt text) is read from the response: the first and last year with a valid value, and the complete years that enter the trend. Keys ending in 13 (annual means) are skipped and the -999 fill value is dropped. The POWER and GISTEMP ranges are kept separate and labeled. Extra rigor on every report: the Theil-Sen median slope, a p value adjusted for lag 1 autocorrelation (AR(1) effective sample size), and the pace of the last 15 complete years against the full series. When the regression is significant but Theil-Sen or the adjusted p disagree, the verdict stays Inconclusive and says why. Temperature reports add days vs nights (T2M_MAX and T2M_MIN, each with its own year range) and every report a signal vs noise bar. Every report also shows window stability (every 25 year window under the same rule), a NASA Worldview link to the hottest month against normal since satellite true color began, and, for significant temperature trends, a side by side comparison with the GISTEMP latitude band and the planet on the same years (ZonAnn.Ts+dSST.csv). "Export evidence" downloads the yearly values (CSV) and every statistic with its sources (JSON).
- Open-Meteo geocoding for city search: https://open-meteo.com/

## Run
```
npm install
npm run dev
```
Open http://localhost:3000.

## Scripts
- `npm test` runs the statistics, data and map tests (vitest).
- `npm run build:grid` recomputes `public/data/brazil-grid.json` (1° grid over Brazil, live NASA POWER calls).
- `npm run build:topo` rebuilds `public/geo/brazil-states.topo.json` from the Brazil state boundaries (click_that_hood, Code for America).

## Stack
Next.js 14, TypeScript, Tailwind CSS, ECharts, d3-geo, topojson-client, world-atlas, Source Serif 4 and Inter via next/font.

## AI use (disclosure for the submission form)
Claude (Anthropic) was used throughout development: to write and refactor the Next.js code, the statistics and data pipeline, the tests, the map logic and the UI copy, and to run visual QA. The team reviewed and directed every change. No number shown in the app comes from the AI: every trend, interval, p-value and count is computed live from NASA POWER, NASA GISS GISTEMP v4 and the Brazil grid built from NASA POWER.

## No keys, no login
NASA POWER, GISTEMP and Open-Meteo geocoding are open and keyless, so the public demo needs no login and no environment variables.
