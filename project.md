# Kasa: read any place on Earth like a core sample

Product name: **Kasa** (Hausa for earth and land). The drill-core design concept is called Strata.
NASA Space Apps Challenge 2026 entry
Challenge: **Be An Earth System Trend Detective** (official challenge, must stay on it)
Challenge page: https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/ (verified Nov 15 2026)
Event: local event in Gombe, Nigeria. Submission deadline: Nov 15, 2026, 11:59 PM local time.

This file is the single source of truth for the project. The AI agent reads it first, then builds in the phase order below. Do not add features outside this file without asking.

---

## 1. What we are building

A web app with a 3D spinning globe. The user clicks any spot (or types a place name or coordinates). The globe dives into that spot and opens a place view where they can:

1. See the place on a map with real NASA satellite imagery.
2. Scrub through the last 10 years (and optionally longer) and watch the land change.
3. See NASA climate data for that exact spot as a chart, with a **statistical test that says whether the change is real or just normal variation**. This is the part that answers the challenge, and it is non-negotiable.
4. Read the history and culture of the place, and recent news about it.
5. Ask an AI assistant questions about that place. The AI only answers from data we fetched.

The visual idea: every place is treated like a **drill core**. Time is the vertical axis. Each year is a layer (a stratum). The whole interface is built around that one idea.

### Why it fits the challenge

The challenge asks for a tool to pick Earth science variables, visualize change over time, and judge whether the change is statistically significant. Our core (globe, variables, time view, significance test) does exactly this. History, culture, news and AI chat are the layer on top that makes it feel like a real product. If time runs short, the core ships and the layer on top gets cut. Never the reverse.

### Who it is for

Students, teachers, local leaders and curious people. The test: a secondary school student in Gombe can open it, tap their own area, and understand what changed.

---

## 2. Scope and priorities

Hard rule: every phase must end in a working, demo-able app. Cut from the bottom of the list.

| Phase | What | Must have |
|---|---|---|
| 1 | Globe, click, dive to map view | yes |
| 2 | Satellite time travel (date scrubber) | yes |
| 3 | NASA data chart + significance test + plain-language verdict | **yes, this is the challenge answer** |
| 4 | Place name, coordinates search | yes |
| 5 | History and culture panel (Wikipedia, Wikidata) | yes |
| 6 | Year-vs-year swipe compare on the map | high value, cheap |
| 7 | AI chat, grounded on fetched data | yes if time allows |
| 8 | Recent news panel (GDELT) | if time allows |
| 9 | Share card export (image of the place plus its verdict) | stretch |

Out of scope: user accounts, databases, payments, mobile native apps, any NASA data we cannot reach with a simple public API.

---

## 3. Data sources and APIs

Verify every endpoint, parameter and layer name against its official docs before relying on it. The ones below are from general knowledge and may differ in detail.

### NASA (core, the challenge answer)

- **NASA POWER API** (no login, no key). Daily and monthly point data since 1981. Use for the trend analysis.
  - Example: `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR&community=AG&longitude={lon}&latitude={lat}&start=2006&end=2025&format=JSON`
  - Variables for the MVP: `T2M` (air temperature, °C), `PRECTOTCORR` (rainfall, **mm/day**, not mm/month). Optional: `GWETROOT` (root zone soil wetness) is confirmed available in POWER.
  - Verified response details: monthly keys are `YYYYMM` and `MM=13` is the annual value (ignore it, we build our own annual series); missing data is `-999`; the source is MERRA-2 on a ~0.5° x 0.625° model grid, so a "point" is a grid cell, not a station. Say so in the UI.
  - No published rate limit, but a 429 is possible and usage is monitored. Cache every response.
- **NASA GIBS** (no login). Satellite imagery tiles that accept a date. Use for the map and time travel.
  - Tile pattern (WMTS, EPSG:3857): `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{YYYY-MM-DD}/{TileMatrixSet}/{z}/{y}/{x}.jpg`
  - Tile matrix set is **per layer** and must not be guessed. Verified: `MODIS_Terra_CorrectedReflectance_TrueColor` and `VIIRS_SNPP_CorrectedReflectance_TrueColor` use `GoogleMapsCompatible_Level9`; `BlueMarble_NextGeneration` and `BlueMarble_ShadedRelief_Bathymetry` use `GoogleMapsCompatible_Level8`.
  - Verified layer IDs: `MODIS_Terra_CorrectedReflectance_TrueColor` (from 2000-02-24), `VIIRS_SNPP_CorrectedReflectance_TrueColor` (from 2015-11-24), `VIIRS_NOAA20_...`, `VIIRS_NOAA21_...`, plus the two Blue Marble layers. Level9 means max native zoom 9, so set `maxzoom: 9` on the raster source and overzoom above it.
  - Gaps in daily coverage are normal. Use MODIS Terra for the 10-year window, with a fallback chain, and always show the date actually displayed.
  - Clouds: for year-vs-year comparison, always use the **same day of year** and prefer the dry season for the region so images are clear. Show the date used on screen.
- Earthdata Login is NOT required for the MVP. Do not add anything that needs it unless there is spare time.

### Context layer (history, culture, news)

- **Wikipedia geosearch**: articles near a coordinate. `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord={lat}|{lon}&gsradius=10000&gslimit=10&format=json&origin=*`
- **Wikipedia page summary**: `https://en.wikipedia.org/api/rest_v1/page/summary/{title}`
- **Wikidata**: structured facts (population, founding, notable people) for the matched place.
- **Reverse and forward geocoding**: OpenStreetMap Nominatim. Its usage policy (checked Nov 15 2026) bans autocomplete outright, so search fires on submit only, never as you type. Max 1 request per second, a real User-Agent or Referer, cache every result, and proxy through our own route so the provider can be swapped. Show OSM attribution.
- **GDELT DOC API**: recent news by place name. Rate limited, so cache and debounce.
- Wikipedia text is CC BY-SA. Show attribution and a link to the source on every history card.

### Rules for all data

- Every request goes through one small client module with caching (memory plus browser storage) and timeouts.
- Every panel has loading, empty and error states. Small villages will have thin coverage: say so honestly ("No encyclopedia entry within 10 km. Showing the nearest larger place.").
- Prefetch a **demo pack** for three places (Gombe, Lake Chad area, one place outside Africa) and store it as static JSON in the repo. If the event wifi dies, the demo still works.

---

## 4. The science (do not get this wrong)

This is what makes the project a real answer to the challenge. Build it in `/lib/stats` with unit tests.

1. Fetch monthly values for the chosen variable for the chosen window (default 10 years, allow 20 and 40 since POWER goes back to 1981).
2. Remove the seasonal cycle: for each calendar month, subtract that month's average across the window. The result is the monthly anomaly.
3. Compute annual mean anomalies.
4. Run a **Mann-Kendall trend test** to get a p-value, and a **Theil-Sen slope** for the size of the change per decade. Also implement the seasonal Mann-Kendall variant on the monthly anomalies if time allows.
5. Convert the result into a verdict with plain language. Examples:
   - "Temperature here rose about 0.3 C per decade over 2016 to 2025. This change is statistically significant (p = 0.02)."
   - "Rainfall shows no significant trend over 2016 to 2025 (p = 0.41). Year-to-year swings are larger than any trend."
6. Honesty rules for the copy:
   - Ten years is short. When the window is 10 years, always add a line that short windows give weak evidence and offer a one-tap button to extend to 40 years.
   - Never say "climate change caused this" from one place and one window. Say "change in this window".
   - Always show the data source and window under the chart.
7. Visualize the uncertainty: show the trend line, the slope, the p-value, and a clear "significant / not significant" state. Do not use a bare line chart.

Unit tests must cover: a known increasing series (significant), pure noise (not significant), a flat series, and a series with a strong seasonal cycle but no trend (must NOT be flagged as trending).

---

## 5. Product experience

### The user flow

1. **Open**: a slowly rotating globe fills the screen. One search field: "Search a place or paste coordinates".
2. **Click or search**: the globe turns to face the spot, the camera descends, satellite tiles sharpen, and the globe flattens into a map. This dive is the single memorable moment. Spend design effort here.
3. **Place view**: the map is the hero. The **core** (a vertical strip of year layers) appears on the right.
4. **Scrub**: dragging the core changes the imagery date and moves a marker on the chart.
5. **Read**: a side panel with tabs for History, Culture, Now, and Ask.
6. **Compare**: pick two years and swipe between them on the map.

### Layout concept

Globe screen:

```
+--------------------------------------------------------------+
| Kasa                                            [about]      |
|                                                              |
|                      (  spinning globe  )                    |
|                                                              |
|   +--------------------------------------+                   |
|   | Search a place or paste coordinates  |                   |
|   +--------------------------------------+                   |
+--------------------------------------------------------------+
```

Place view (desktop):

```
+--------------------------------------------------------------+
| < Globe   Gombe, Nigeria   10.29 N, 11.17 E        [share]   |
+------------+-----------------------------------+-------------+
| History    |                                   |  The core   |
| Culture    |        satellite map              |  2025  |||  |
| Now        |     (swipe compare handle)        |  2024  |||  |
| Ask        |                                   |  ...        |
|            |                                   |  2016  |||  |
|            +-----------------------------------+             |
|            |  Variable: Temperature | Rainfall |  Verdict    |
|            |  chart with trend line + p-value |  text       |
+------------+-----------------------------------+-------------+
```

On mobile: map on top, the core becomes a horizontal strip below it, panels become a bottom sheet with tabs.

Alignment: left aligned text everywhere. Panels use a fixed reading column of under 70 characters.

---

## 6. Visual design direction (high priority)

The UI is a major part of what judges will remember. Do not ship a generic dark dashboard.

### Concept

**Strata**: geological layers, drill cores, tree rings. The data palette comes from rock and soil, not from a tech default. Time is shown as stacked bands. The chart is paired with a second view: a **ring view** where each ring is one year (like tree rings), colored by anomaly. The core strip, the ring view and the chart are three views of the same data and share one color scale.

### Starting tokens (the agent may refine, but must follow the process in section 7)

Color:
- Basalt `#14181D` (base background, not pure black)
- Slate `#232A32` (panels)
- Chalk `#E8E4D8` (primary text)
- Tide `#4FA3A5` (cool / wet / below-normal values)
- Ochre `#D6A23A` (warm / dry / above-normal values)
- Lichen `#9DB36B` (vegetation, positive status)
- Madder `#C2483D` (rare, only for "significant change" emphasis)

Anomaly scale: a diverging scale from Tide through a neutral Chalk-grey to Ochre. Check it stays readable for color-blind users and always pair color with a number or label.

Type:
- UI and headings: **Familjen Grotesk** (variable, use real weight contrast)
- History and culture reading text: **Spectral** (serif, slightly larger line-height)
- Numbers: use tabular figures from the UI face, not a monospace font
- Type scale: define it once as tokens (for example 13, 15, 18, 24, 36, 56) and use only those

Shape and surface:
- Do not put everything in identical rounded cards with the same soft shadow.
- Use the layered idea: panels are cut like slabs with a clean flat edge, content separated by thin strata lines of varying thickness that encode meaning (for example a thicker line marks a significant change year).
- Map and globe get the most space. Panels stay quiet.

Motion:
- One orchestrated moment: the globe-to-map dive.
- Everything else only responds to user action: the core scrubbing, the swipe compare, opening a panel. No fade-and-slide-up on every section, no hover animations on everything.
- Respect `prefers-reduced-motion` (the dive becomes a quick cross-fade).

Copy rules:
- Plain language, sentence case, active voice.
- Buttons say exactly what happens ("Compare two years", "Extend to 40 years").
- Errors say what went wrong and what to do next.
- No all-caps eyebrow labels, no "01 / 02 / 03" numbering unless the content is truly a sequence.

Quality floor: responsive down to phone width, visible keyboard focus, sufficient contrast, tap targets of at least 44 px, works on a slow connection.

---

## 7. Process rules for the AI agent

1. **Before any UI code**, write a short design plan: tokens (color, type, layout, principles), two or three layout sketches, and a note on what makes it different from a default dashboard. Review it against section 6, revise anything generic, then build.
2. Avoid common AI-design defaults: warm cream background with serif plus clay accent, near-black with one neon accent, uniform rounded card grids, tracked-out all-caps labels above every heading.
3. Spend boldness in one place (the dive and the core). Keep everything else disciplined.
4. Work phase by phase. After each phase, make sure it runs, then summarize what works and what is next. Do not start the next phase with a broken build.
5. Write the stats module and its tests before wiring it to the UI.
6. Ask before changing the stack, adding a dependency that costs more than a few KB, or adding a data source not listed here.
7. Never put API keys in client code.

---

## 8. Suggested tech stack

Keep it simple and fast to deploy.

- Vite, React, TypeScript
- **MapLibre GL JS with globe projection** for one engine across globe and flat map, so the dive is a single continuous camera move. Fallback if globe projection causes trouble: `react-globe.gl` (Three.js) for the globe plus MapLibre for the place view.
- GIBS raster tiles as MapLibre raster sources with the date baked into the tile URL.
- Charts: hand-rolled SVG with D3 helpers (scales, shapes). Needed for the custom ring view and trend overlay.
- Stats: write our own `mannKendall` and `theilSen` functions (small, testable). Vitest for tests.
- AI chat: a small server route (`/api/chat`) so the key stays server-side. Provider-agnostic: any LLM API through env vars.
- Hosting: Vercel (or similar).
- State: React state plus a small store (Zustand). No database.

Suggested structure:

```
/src
  /app            routes and layout
  /components     Globe, PlaceMap, Core, RingView, TrendChart, Verdict, panels
  /lib
    /api          power.ts, gibs.ts, wiki.ts, wikidata.ts, geocode.ts, gdelt.ts
    /stats        anomalies.ts, mannKendall.ts, theilSen.ts, verdict.ts (+ tests)
    /cache.ts
  /data/demo      prefetched JSON for the three demo places
  /styles         tokens.css
/api/chat.ts
```

Environment variables: `LLM_API_KEY`, `LLM_MODEL` (server only).

---

## 9. AI assistant (phase 7)

- Lives in the Ask tab of the place view.
- The server builds a context bundle for the current place: coordinates, place name, the computed trend results, the NASA series summary, the Wikipedia and Wikidata text, and recent news headlines.
- The system prompt rules:
  - Answer only from the context bundle. If the answer is not there, say "I don't have that for this place" and suggest where to look.
  - Never invent history, dates, population numbers or events.
  - Cite the source for each claim (NASA POWER, Wikipedia, GDELT).
  - Explain the statistics in plain language when asked, and never claim more than the test shows.
  - Short answers by default.
- Suggested starter questions shown as buttons: "What changed here in the last 10 years?", "Is this trend real or just noise?", "Tell me the history of this place."
- Small places will have little context. The assistant must handle that gracefully, not fill the gap with guesses.

---

## 10. Build order and time plan

The deadline is tonight. Cut from the bottom.

1. Project setup, tokens, globe renders and spins. Click returns coordinates.
2. Dive animation to a flat map with GIBS imagery. Phase 1 done.
3. Date scrubber (the core strip) driving GIBS imagery. Phase 2 done.
4. POWER client, anomaly computation, Mann-Kendall, Theil-Sen, tests. Chart plus verdict wired up. **Phase 3 done: this is a complete, on-challenge entry.**
5. Search by name and coordinates, reverse geocoding.
6. History and culture panel with attribution.
7. Swipe compare.
8. AI chat.
9. News panel.
10. Demo pack, README, screenshots, demo video, submission.

Reserve the last 90 minutes for polish, the demo pack, the write-up and the submission form. A finished phase 3 plus a great demo beats an unfinished phase 8.

---

## 11. Definition of done

- Globe spins, click dives to the place, no console errors.
- Any place on Earth shows satellite imagery for at least 10 years of dates.
- For temperature and rainfall at any point, the chart, trend line, slope, p-value and plain-language verdict render, and the tests pass.
- Short-window honesty message and "extend to 40 years" work.
- History panel shows attributed Wikipedia content, or an honest empty state.
- Works on a phone and with the demo pack when offline.
- README explains the challenge, data sources, method, and how to run.
- Public URL deployed, short demo video recorded, submission filed before the deadline.

---

## 12. Demo script (90 seconds)

1. Open on the spinning globe. "This is Kasa. Any place on Earth, read like a core sample."
2. Click Gombe. The dive plays. "This is where we are right now."
3. Scrub the core back 10 years. Imagery changes. Use the swipe compare for two dates.
4. Show the chart and verdict. "Is this real or just noise? Kasa tests it. Temperature has a significant trend here. Rainfall does not."
5. Hit "Extend to 40 years". "Ten years is short, so Kasa is honest about it."
6. Open History. "Every place has a story, with sources."
7. Ask the AI one question. Show the grounded answer with a source.
8. Close: "NASA data, a real statistical test, and anyone can use it."

---

## 13. Risks and how to handle them

- **Scope is large.** Protect phases 1 to 4. Everything else is optional.
- **Globe plus map engine trouble.** Use the fallback stack in section 8 early, not at the last minute.
- **API limits or no internet at the venue.** Demo pack in the repo, caching everywhere, Nominatim at 1 request per second.
- **Cloudy imagery.** Same day-of-year rule, dry-season dates, show the date on screen, let the user nudge the date.
- **Sparse history for small places.** Honest empty states and nearest-larger-place fallback.
- **Statistical overclaiming.** Follow section 4 wording rules exactly.
- **Layer IDs or endpoints differ from this file.** Check official docs and GetCapabilities first, and fix this file when something differs.

---

## 14. Credits and attribution (show in the app footer or about page)

- NASA POWER and NASA GIBS (Global Imagery Browse Services)
- Wikipedia and Wikidata (CC BY-SA, with links to source pages)
- OpenStreetMap contributors (Nominatim)
- GDELT Project
- Built for the NASA International Space Apps Challenge 2026
