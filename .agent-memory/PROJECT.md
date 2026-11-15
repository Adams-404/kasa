# PROJECT

> What this project is, how it is built, and how to run it. Fill this from the
> repo itself during bootstrap. Names of env vars only — NEVER their values.

## What This Is
Kasa is a React web app for the NASA Space Apps “Earth System Trend Detective” challenge. It lets users select a place, inspect NASA imagery over time, calculate statistically tested NASA POWER trends, read nearby history, and ask a grounded assistant.

## Stack
TypeScript, React 19, Vite 8, MapLibre GL JS 6, Vitest 3. No database.

## Architecture
`src/main.tsx` mounts the app. `src/app/App.tsx` coordinates place selection, imagery, comparison, history, and analysis. `src/lib/api` contains cached public API clients; `src/lib/stats` contains the seasonal anomaly, Mann-Kendall, Theil-Sen, and verdict pipeline. `server/` and `api/` hold the server-only grounded chat handler.

## Folder Layout
- `src/components`: UI panels and map/globe views
- `src/lib/api`: NASA, Wikipedia, Wikidata, Nominatim, and chat clients
- `src/lib/stats`: tested trend calculations
- `server`, `api`: development/production chat handlers
- `docs`: verified challenge and data-source notes

## Commands
| Action | Command |
|---|---|
| Install deps | `npm install` |
| Run (dev) | `npm run dev` |
| Build | `npm run build` |
| Test | `npm test` |
| Lint / typecheck | `npx tsc -b` |
| Run (prod) | `npm run preview` |
| Deploy | UNVERIFIED |

## Environment Variables (names only, never values)
| Name | Purpose |
|---|---|
| `LLM_BASE_URL` | OpenAI-compatible chat endpoint |
| `LLM_API_KEY` | Server-only model credential |
| `LLM_MODEL` | Server-side model name |

## Known Quirks
- NASA POWER monthly response includes month 13 annual values; the client ignores them and computes annual anomalies itself.
- Nominatim searches are submit-only, throttled, cached, and proxied in development.
- The offline demo pack seeds NASA POWER trend data for the three demo places; `src/lib/demoPlaces.ts` defines their start chips.
- The place map overlays OpenStreetMap raster detail from zoom 7 upward; NASA MODIS remains the historical satellite layer underneath.

## External Services
NASA GIBS, NASA POWER, OpenStreetMap Nominatim, Wikipedia, Wikidata, optional OpenAI-compatible LLM endpoint, and GDELT planned for issue #6.
