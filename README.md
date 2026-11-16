# Anomalix · Climate Detective

NASA Space Apps Challenge 2026, challenge "Be an Earth System Trend Detective".

- Live app: https://anomalix-khaki.vercel.app
- Demo video: https://youtu.be/6kn-iO92-EM

Type a city, or pick Global, and get an honest verdict on the trend of air temperature, precipitation, relative humidity or wind speed from open NASA data. When the evidence is not there, the verdict says Inconclusive.

## Features

**The verdict**
- OLS slope per decade with its 95% confidence interval and regression p value.
- Mann-Kendall second check (Z, p, Sen's slope). When the two methods disagree, the verdict is Inconclusive.
- Confidence seal: High, Medium or Inconclusive, from one fixed rule shown on the How it works page.
- Extra rigor on every report: Theil-Sen median slope, a p value adjusted for lag 1 autocorrelation (AR(1) effective sample size), and the pace of the last 15 complete years against the full series (a descriptive comparison, not a formal test). When the regression is significant but Theil-Sen or the adjusted p disagree, the verdict stays Inconclusive and says why.
- Relative humidity trends are expressed in percentage points per decade (absolute RH units); the NASA parameter unit stays %.

**Report panels**
- Signal vs noise bar on every report.
- Days vs nights for temperature (T2M_MAX and T2M_MIN, each with its own year range).
- Seasons panel: one trend per calendar quarter, with a Bonferroni-corrected bar; the highlighted season is the steepest one in the direction of the yearly trend.
- Daily-high distribution (temperature, place reports): early vs recent years of monthly mean daily highs (T2M_MAX), with a Mann-Whitney test.
- Climate analog: for significant temperature trends in Brazil, the grid point whose 1980s climate matches this place today.
- Window stability: the same rule on every 25-year window; shown only for series of at least 35 complete years.
- "Two sources": the local NASA POWER (MERRA-2 reanalysis) temperature trend beside the global NASA GISTEMP v4 (station based) trend on the same years, a comparison with a different method, not a validation. The local to global rate ratio is shown only when the local trend is significant.
- Latitude band comparison: for significant temperature trends, the place beside its GISTEMP latitude band and the planet on the same years.
- Pattern scaling: the local annual temperature anomaly regressed on the global GISTEMP annual anomaly (beta in °C per °C of global change).
- NASA Worldview link (local temperature reports only): true color imagery of the hottest month against normal since satellite true color began.

**Tools**
- City comparator (`/compare`): two places side by side on the same variable, period, season and shared years, with a z test on the slope difference (delta ± 1.96 standard errors) and a warning when the two series are correlated (r ≥ 0.5), since the test assumes independence.
- "This week vs 45 years of climate" widget on place reports: the 7-day Open-Meteo forecast against NASA POWER daily climatology (rain frequency and 10th/90th percentile highs within 15 days of each date, 1981 onward). It is labeled as weather, not climate.
- Exports: the yearly values (CSV), a monthly tidy CSV with climatology and deseasonalized anomaly, and "Export evidence" (CSV plus a JSON of every statistic and source).
- Share card: a 1080 × 1350 image drawn in the browser from the same live analysis.
- Brazil Grid page: a 1° grid over Brazil, state and region trends, and a decade-by-decade animation (temperature only).

**Periods and years**
- You can choose the analysis period (start and end year) and the season; the default is the full record.
- No year range is typed into the app. Every range shown (report, share card, CSV, captions, alt text) is read from the data: the first and last year with a valid value, and the complete years that enter the trend. Keys ending in 13 (annual means) are skipped and the -999 fill value is dropped. The POWER and GISTEMP ranges are kept separate and labeled.
- City and global reports are computed live from public NASA data. GISTEMP falls back to a dated built-in snapshot if the live file is unreachable. The Brazil grid and decade pages are precomputed from NASA POWER and shipped as data files.

## Data
- NASA POWER monthly point API (MERRA-2 based), parameters T2M, PRECTOTCORR, RH2M and WS2M, community RE: https://power.larc.nasa.gov/api/temporal/monthly/point
- NASA POWER daily point API, parameters T2M_MAX, T2M_MIN and PRECTOTCORR, for the forecast widget's climate context only: https://power.larc.nasa.gov/api/temporal/daily/point
- NASA GISS GISTEMP v4 global monthly and annual means: https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv
- NASA GISS GISTEMP v4 zonal annual means: https://data.giss.nasa.gov/gistemp/tabledata_v4/ZonAnn.Ts+dSST.csv
- NASA Worldview links (no imagery or data is fetched): https://worldview.earthdata.nasa.gov/
- Open-Meteo forecast API, 7-day forecast for the widget only: https://api.open-meteo.com/v1/forecast
- Open-Meteo geocoding for city search: https://geocoding-api.open-meteo.com/v1/search

## Run
```
npm install
npm run dev
```
Open http://localhost:3000.

## Scripts
- `npm test` runs the statistics, data and map tests (vitest).
- `npm run build:grid` recomputes `public/data/brazil-grid.json` (1° grid over Brazil, live NASA POWER calls).
- `npm run build:decades` recomputes `public/data/brazil-decades.json` (decade means for the Brazil Grid animation).
- `npm run build:topo` rebuilds `public/geo/brazil-states.topo.json` from the Brazil state boundaries (click_that_hood, Code for America).
- `npm run build:gistemp` regenerates the bundled GISTEMP fallback snapshot (`-- --fetch` downloads fresh copies first).

## Stack
Next.js 14, TypeScript, Tailwind CSS, ECharts, d3-geo, topojson-client, world-atlas, Source Serif 4 and Inter via next/font.

## AI use (disclosure for the submission form)
Claude (Anthropic) was used throughout development: to write and refactor the Next.js code, the statistics and data pipeline, the tests, the map logic and the UI copy, and to run visual QA. The team reviewed and directed every change. No number shown in the app comes from the AI: every trend, interval, p-value and count is computed live from NASA POWER, NASA GISS GISTEMP v4, Open-Meteo and the Brazil grid built from NASA POWER.

## No keys, no login
NASA POWER, GISTEMP and Open-Meteo are open and keyless, so the public demo needs no login and no environment variables.
