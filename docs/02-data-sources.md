# Data sources: what is actually true

All checks run live on 2026-11-15 unless marked otherwise. Anything not labelled
**verified** is still an assumption.

---

## 1. NASA POWER (the data behind the trend test)

**Verified.** No key, no login, CORS-open, JSON.

### Endpoint

```
https://power.larc.nasa.gov/api/temporal/monthly/point
  ?parameters=T2M,PRECTOTCORR
  &community=AG
  &longitude=11.17&latitude=10.29
  &start=2006&end=2025
  &format=JSON
```

`community` may be `AG` (agroclimatology), `SB` (sustainable buildings), `RE` (renewable
energy). `AG` is correct for us. Both of our MVP variables are returned under `AG`.

### Response shape

```
{ type, geometry { coordinates: [lon, lat, elevation_m] },
  properties { parameter: { T2M: {"200601": 24.1, ... }, ... } },
  parameters { T2M: {units:"C", longname:"Temperature at 2 Meters"} },
  header { fill_value: -999.0, start, end, sources:["MERRA2"], time_standard:"LST" },
  messages, times }
```

- **Monthly keys are `YYYYMM`.** Key `MM=13` is the **annual** value for that year
  (verified empirically: 13 values per year). We ignore key 13 and build our own annual
  series, so the statistics are ours and testable.
- **`fill_value` is `-999.0`.** Must be filtered before any maths, or one missing month
  poisons the anomaly baseline.
- **Units (verified):** `T2M` = `C` (°C), `PRECTOTCORR` = `mm/day`.
  So a monthly rainfall number is a daily-mean rate, not a monthly total. Any "mm" we show
  must say mm/day, or be converted (× days in month) and labelled as such.
- `T2M` longname "Temperature at 2 Meters"; `PRECTOTCORR` "Precipitation Corrected".
- Optional third variable: `GWETROOT` (root zone soil wetness, fraction 0-1) exists in
  POWER. Not in the MVP.

### Coverage and honesty

- Meteorological parameters come from **MERRA-2**, Jan 1 1981 → end of previous year.
- MERRA-2 is a **model reanalysis on a ~0.5° × 0.625° grid** (roughly 55 × 70 km at the
  equator). A POWER "point" is a grid cell, not a weather station.
  → The UI must not imply station-level precision. Say "NASA POWER / MERRA-2 grid cell".
  → This also justifies our smallest honest claim: the trend is for the cell, not the town.
- Max 20 parameters per point request.
- `start`/`end` accept years (YYYY) for monthly, or YYYYMMDD for daily.

### Limits

- No published numeric rate limit. The API returns **429 Too Many Requests** and NASA
  says usage is monitored for equitable access. Treat it as "be polite": cache every
  response, never fetch on every keystroke, one request per place+window.
- Errors come back as **422** with a list of syntax/parameter violations — read the body,
  do not assume the request was fine.

---

## 2. NASA GIBS (imagery + time travel)

**Verified** against the live GetCapabilities and live tile requests.

Capabilities (large, ~5.8 MB, cache it, never fetch at runtime):

```
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml
```

### Tile URL pattern (confirmed by HTTP 200 image/jpeg)

```
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{YYYY-MM-DD}/{TileMatrixSet}/{z}/{y}/{x}.jpg
```

Order matters: `{layer}/default/{time}/{tilematrixset}/{z}/{y}/{x}`.

### Real layer IDs (from GetCapabilities, 862 layers total in `best`)

| Layer ID | Tile matrix set | Format | Time support |
|---|---|---|---|
| `MODIS_Terra_CorrectedReflectance_TrueColor` | `GoogleMapsCompatible_Level9` | jpeg | 2000-02-24 → present, daily, with gaps |
| `VIIRS_SNPP_CorrectedReflectance_TrueColor` | `GoogleMapsCompatible_Level9` | jpeg | 2015-11-24 → present, daily, with gaps |
| `VIIRS_NOAA20_CorrectedReflectance_TrueColor` | `GoogleMapsCompatible_Level9` | jpeg | 2018-01-05 → present |
| `VIIRS_NOAA21_CorrectedReflectance_TrueColor` | `GoogleMapsCompatible_Level9` | jpeg | 2023-02-10 → present |
| `BlueMarble_NextGeneration` | `GoogleMapsCompatible_Level8` | jpeg | static, no date |
| `BlueMarble_ShadedRelief_Bathymetry` | `GoogleMapsCompatible_Level8` | jpeg | static, no date |

Tested live: `MODIS_Terra_.../default/2025-11-10/GoogleMapsCompatible_Level9/9/290/430.jpg`
returned `200 image/jpeg` (7724 bytes); the VIIRS SNPP equivalent returned 200 as well.

### What we actually use for time travel (verified 2026-11-15)

Daily true colour on a fixed day has two failures we hit in testing: **missing days**
(`MODIS_Terra_CorrectedReflectance_TrueColor` has no scene for Gombe on 2016-11-05 or
2019-11-05; GIBS returns a 1.6 kB black tile) and **cloud**.

Fix, verified across 2016-2026 at Gombe: the 8-day surface reflectance composite

| Layer ID | Tile matrix set | Format | Cadence |
|---|---|---|---|
| `MODIS_Terra_L3_SurfaceReflectance_Bands143_8Day` | `GoogleMapsCompatible_Level8` | jpeg | 8-day, grid starts 2000-02-26 |

- Every sampled year had a tile (no gaps), and the composites were cloud-free.
- Composite periods begin on `2000-02-26 + k*8 days`; snap any target date down to that
  grid. For 5 Nov 2025 the tile date is 2025-11-05; for 2017 it is 2017-10-30.
- Cost: 500 m resolution (Level8, ~600 m/px at the equator) instead of 250 m, and a faint
  mosaic seam at some tile edges. Accepted: complete and comparable beats crisp and patchy.
- Bands 1-4-3 rendered as RGB: vegetation reads green, bare soil tan. NASA calls this
  "surface reflectance", not true colour, so we do not call it true colour either.

### Consequences for our build

- **`Level9` means max native zoom 9** (~300 m/px at the equator). MapLibre must be told
  `maxzoom: 9` on the raster source so it upscales instead of requesting 404s at z10+.
  At a town view this looks soft; that is a data limit, not a bug. Zoom the map to ~10-11
  and let it overzoom.
- **Use MODIS Terra as the primary imagery layer** for 2006-2025: it covers the whole
  window, while VIIRS SNPP only starts Nov 2015 and has gaps (e.g. 2022-07-27 → 2022-08-10,
  2024-05-31 → 2024-06-04).
- **Time travel uses the 8-day composite, not daily true colour.** Daily true colour has
  no scene at all on some days (verified: Gombe 2016-11-05 and 2019-11-05 return a black
  tile) and is often cloud-covered. `MODIS_Terra_L3_SurfaceReflectance_Bands143_8Day`
  is complete for every year checked and cloud-screened, at 500 m instead of 250 m.
  Snap the sample date to its 8-day grid (base 2000-02-26) and show the period on screen.
- **Fallback chain** when a date has no MODIS scene: `VIIRS_NOAA20` → `VIIRS_SNPP` →
  nearest previous available MODIS date. Show the date actually displayed.
- **Globe base layer:** `BlueMarble_ShadedRelief_Bathymetry` (dark, no date needed) at low
  zoom, so the spinning globe never depends on a daily scene.
- **Gaps are normal.** GIBS returns a "no data" tile rather than a 404 for missing days.
  We cannot detect it from the tile alone, so we also keep a small list of known-missing
  dates per demo place rather than guessing.
- Attribution: credit "NASA GIBS / Worldview" in the map corner.

---

## 3. Wikipedia

**Verified live.**

- Geosearch (CORS ok with `origin=*`):
  `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord={lat}|{lon}&gsradius=10000&gslimit=10&format=json&origin=*`
  For Gombe (10.29, 11.17) it returned `Gombe, Nigeria` at 826 m, then `Gombe State`,
  `Pantami Stadium`, etc. — a good, honest "nearby articles" list.
- Summary REST: `https://en.wikipedia.org/api/rest_v1/page/summary/{title}` returned 200.
- **Gotcha (verified):** the bare title `Gombe` is a **disambiguation page** (`type:
  "disambiguation"`, "Gombe may refer to:"). Never take a name match as the place. Always
  resolve through geosearch first, and treat `type: "disambiguation"` as "no article".
- Attribution: CC BY-SA. Every history card needs the article link and the licence line.

---

## 4. Wikidata

**Verified live.**

- Search only works on plain names: `wbsearchentities&search=Gombe Nigeria` returned
  **zero results**, `search=Gombe` returned five entities including the disambiguation
  problem (Gombe State, Gombe LGA, a French commune, a Kinshasa commune, a surname).
- **Therefore: never match Wikidata by name.** Resolve by sitelink from the Wikipedia
  article we already chose:

```
https://www.wikidata.org/w/api.php?action=wbgetentities
  &sites=enwiki&titles=Gombe, Nigeria
  &props=claims|labels|descriptions&languages=en&format=json
```

  Verified: returned `Q591598`, `P625` coordinates `10.2833, 11.1667`, `P1082` population
  `+198546`.

- Useful claims: `P625` coords, `P1082` population, `P571` inception, `P17` country,
  `P131` located in admin territory, `P2046` area, `P856` official website.
- Quantities arrive as strings with a leading `+` (`"+198546"`) — parse carefully.
- Licence: CC0 for the data, but we still credit Wikidata.

---

## 5. Nominatim (geocoding)

**Verified against https://operations.osmfoundation.org/policies/nominatim/**

- Hard cap: **1 request per second** per application.
- Must send a **valid HTTP Referer or User-Agent** identifying the app.
- **Autocomplete is explicitly forbidden.** ("Auto-complete search … you must not implement
  such a service on the client side using the API.") → **no search-as-you-type.** Search
  fires on submit only. This is a real change from the "search field" instinct.
- Must cache results; repeat queries can be classified as faulty and blocked.
- Should proxy through our own endpoint so we can switch providers without shipping a new
  build.
- Must display OSM attribution (ODbL).
- Reverse geocode verified working:
  `https://nominatim.openstreetmap.org/reverse?lat=10.29&lon=11.17&format=jsonv2&zoom=10`
  → `Gombe, Nigeria` with `place_id`, `address`, `boundingbox`.

**Build decision:** a tiny server route `/api/geocode` (Phase 4) that sets a real
User-Agent, enforces 1 req/s in a module-level queue, and caches to disk/memory for the
demo. Client never calls nominatim.openstreetmap.org directly.

---

## 6. GDELT DOC 2.0 API

**Verified live.**

```
https://api.gdeltproject.org/api/v2/doc/doc
  ?query=%22Gombe%22%20Nigeria
  &mode=artlist&maxrecords=5&format=json&sort=datedesc
```

- Returns `{"articles":[{url,title,seendate,socialimage,domain,language,sourcecountry}]}`.
- `seendate` format `YYYYMMDDTHHMMSSZ`; verified fresh items (e.g. `20261112T070000Z`).
- No key. Heavily rate limited and returns **plain text** error bodies on throttling, not
  JSON — the client must handle a non-JSON 200. Cache aggressively, debounce queries.
- Query syntax matters: bare multi-word queries are ANDed and can return nothing. Quote
  the place name, then add a context term.

---

## 7. CORS summary (what can be called from the browser)

| Service | Browser-callable | Notes |
|---|---|---|
| NASA POWER | yes | verified `Access-Control-Allow-Origin` behaviour in practice; still cache |
| NASA GIBS tiles | yes | plain `<img>`/raster tiles |
| Wikipedia / Wikidata | yes | needs `origin=*` on `action=api` calls |
| Nominatim | technically yes | **we proxy anyway** for User-Agent + rate limit |
| GDELT | yes | but throttling needs a proxy/cache for the demo |
