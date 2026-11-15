# Kasa

Read any place on Earth like a core sample.

Kasa answers the **Be An Earth System Trend Detective** challenge at NASA Space Apps
Challenge 2026 (Gombe, Nigeria). Spin a 3D globe, open any place, scrub a decade of NASA
satellite imagery, and get a statistically tested answer to the question the challenge
actually asks: is there a trend here, or is this just noise?

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # stats + search unit tests
npm run build
```

No API keys, no accounts, no database. Every source is a public API.

## What it does

1. **Globe.** A Blue Marble Earth that spins until you touch it.
2. **Dive.** Clicking a point flies the camera down; the projection itself interpolates
   from globe to flat map, so it is one camera move, not a screen change.
3. **Time travel.** A vertical *core* of year bands scrubs the imagery. Every year uses the
   same calendar day (5 November) so years are compared like for like.
4. **Swipe compare.** A draggable divider puts two years side by side on the same
   camera: drag it and the boundary between the years moves under your hand.
5. **History.** A side panel with the nearest Wikipedia article, a few Wikidata facts
   (population, region, country, founded) and links to the source.
6. **Ask.** A third tab answers questions about the point, grounded in exactly what
   the page already fetched: the POWER series and its test, the imagery date, and
   the encyclopedia entry. The panel shows the answer, the sources, and the exact
   context the model was given.
7. **Verdict.** For that point, Kasa pulls monthly temperature and rainfall from NASA
   POWER, removes the seasonal cycle, and runs a Mann-Kendall trend test with a Theil-Sen
   slope. The panel shows the annual anomalies, the fitted change, the p-value, and a
   plain-language sentence that never overclaims.
8. **Honesty switch.** "Extend to 40 years" widens the statistical window and updates the
   caveat, because ten annual points is weak evidence either way.

## The statistics, briefly

- **Seasonal removal first.** Monthly values are compared with that calendar month's mean
  over the window, then averaged by year. Without this, July's warmth would read as a trend.
- **Mann-Kendall** for monotonic trend, using the **exact** null distribution (Mahonian
  dynamic programming) up to n = 40 with no ties, and the tie-corrected normal
  approximation otherwise. Exact matters at n = 10.
- **Theil-Sen** slope: the median of pairwise slopes, so one bad year cannot set the trend.
- **p-values are clamped to [0, 1]** and never printed as zero.
- The verdict copy is unit-tested: a non-significant change is never called a change, and
  nothing is ever described as caused by anything.

`src/lib/stats/` holds the whole pipeline and `src/lib/stats/stats.test.ts` the tests.

## Data sources

| Source | Used for | Notes |
|---|---|---|
| [NASA GIBS](https://earthdata.nasa.gov/gibs) | Globe basemap, year-by-year imagery | `MODIS_Terra_L3_SurfaceReflectance_Bands143_8Day`, 8-day composite, `GoogleMapsCompatible_Level8` |
| [NASA POWER](https://power.larc.nasa.gov/) | Monthly temperature (`T2M`, °C) and rainfall (`PRECTOTCORR`, mm/day) | MERRA-2 reanalysis: a ~0.5° grid cell, not a weather station |
| [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/) | Place search on submit, reverse geocoding a click | No autocomplete, 1 request/second, results cached 30 days |
| [Wikipedia](https://www.wikipedia.org/) | History and culture *(phase 5)* | CC BY-SA, attributed on every card |
| [Wikidata](https://www.wikidata.org/) | Structured facts *(phase 5)* | Resolved by English Wikipedia title, never by name |

Why the 8-day composite: daily true colour has missing days (Gombe 2016-11-05 and
2019-11-05 return a black tile) and is often cloudy. The composite is complete for every
year we checked. The cost — 500 m instead of 250 m and a faint tile seam — is documented in
`docs/02-data-sources.md`.

## Status

| Phase | What | State |
|---|---|---|
| 1 | Globe, click, dive to map view | done |
| 2 | Satellite time travel (the core) | done |
| 3 | POWER data, chart, significance test, verdict | done |
| 4 | Search by name or coordinates, reverse geocoding | done |
| 5 | History and culture panel | done |
| 6 | Year-vs-year swipe compare | done |
| 7 | Grounded AI chat | done |
| 8 | GDELT news panel | next |
| 9 | Share card export | planned |
| — | Demo pack, deployment, submission | planned |

Work is tracked in [issues](https://github.com/Adams-404/kasa/issues). Scope, priorities
and the science rules live in `project.md`; verified endpoint details, layer IDs and
gotchas live in `docs/`.

## The assistant

`api/chat.ts` (production) and the Vite middleware (development) run the same handler,
`server/chat.ts`. The browser posts `{ question, context }`, where `context` is text it
built from data already on the page; the route validates the size, adds the grounding
rules from `server/prompt.ts`, and calls an OpenAI-compatible chat-completions endpoint.
The key stays in the environment:

```bash
cp .env.example .env    # LLM_BASE_URL, LLM_API_KEY, LLM_MODEL
```

No key, no assistant: `GET /api/chat` reports `configured: false` and the tab says so
instead of failing at the first question. The model never sees a request it can't ground
and is instructed to say "I don't have that for this place" rather than guess.

## Limitations we state in the product

- A POWER point is a reanalysis grid cell, not a thermometer in the ground.
- Ten annual points is a short window; forty is better but still one window.
- Imagery comes from an 8-day composite at 500 m, not a photograph of one afternoon. The
  MODIS surface-reflectance product masks water, so open ocean shows no imagery (the
  statistics still work: MERRA-2 covers the ocean).
- The trend is a statistical description of this window. It is not attribution.

## Credits

Map and imagery © NASA GIBS / NASA EOSDIS. Climate data NASA POWER (MERRA-2). Place search
and reverse geocoding © OpenStreetMap contributors, ODbL. Built with React, TypeScript,
MapLibre GL JS and Vite. Statistics implemented in-house so the method is inspectable.
