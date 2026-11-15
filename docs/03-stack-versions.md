# Stack and versions (checked 2026-11-15)

| Thing | Version | Notes |
|---|---|---|
| Node (local) | 22.23.1 | fine for Vite 8 |
| npm | 10.9.8 | |
| `vite` | 8.3.8 | latest |
| `react` | 19.3.1 | latest |
| `maplibre-gl` | 6.18.0 | v5→v6 migration guide exists; globe is built in |

## MapLibre globe: confirmed API

From the MapLibre GL JS v6 API docs and style spec:

- Globe is a **projection in the style**, not a separate library:

```js
const style = {
  version: 8,
  projection: { type: 'globe' },   // default is 'mercator'
  sources: { ... },
  layers: [ ... ],
}
```

- `map.setProjection({ type: 'globe' })` / `{ type: 'mercator' }` switches live
  (signature: `setProjection(projection: ProjectionSpecification): this`).
- The style spec allows **interpolating projection by zoom**:

```json
"projection": {
  "type": ["interpolate", ["linear"], ["zoom"], 2, "globe", 6, "mercator"]
}
```

This is the whole reason we can do the "dive" as one continuous camera move: globe at
world zoom, mercator by the time we reach the place. We drive it explicitly in code so the
moment stays choreographed rather than incidental.

- Raster sources support `maxzoom`, which we set to **9** for GIBS true color
  (`GoogleMapsCompatible_Level9`) so tiles overzoom instead of 404ing.
- Keep `attributionControl` on: "NASA GIBS" is a licence requirement, not decoration.
- The place map also uses OpenFreeMap's OpenStreetMap-derived vector source for roads,
  place labels, street names, and building footprints; its glyph URL is declared in the
  MapLibre style.

## Things we are NOT adding

- No D3 as a runtime dependency — only `d3-scale`, `d3-shape` (few KB) for the chart.
- No component library / no Tailwind preset look. Custom CSS with tokens.
- No Zustand until Phase 2 needs cross-component state; React state first.
