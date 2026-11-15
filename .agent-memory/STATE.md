# STATE

> This is the single source of truth. A fresh agent with zero context must be able
> to read ONLY this file and know exactly what to do next.
> Update this file after every meaningful step. Never in batches. Never "at the end".

## Current Task
Resume the project after the OpenCode handoff and implement the next unfinished demo-readiness work.

## Status
IN_PROGRESS

- Repository reconciled: `main` is clean at commit `724b4e5`, with phases 1-7 implemented.
- No prior OpenCode session or local handoff existed; GitHub issues show #8 is the next unfinished delivery item.
- Bootstrapped `.agent-memory/` and cross-agent pointer files.
- Added `src/lib/demoPack.ts`, `src/lib/demo-pack.json`, and cache seeding so the three demo places serve 1986–2025 NASA POWER data offline.
- Added `src/lib/demoPack.test.ts`; `npm test` and `npm run build` pass.
- Closed completed GitHub issue #5 and commented on issue #8 with the demo-pack progress.
- Committed the implementation as `aee3bd1`; the worktree is clean.
- Confirmed the map already uses NASA MODIS satellite imagery; user chose to keep the reliable 8-day composite rather than switch to sharper but incomplete true-colour dates.
- Committed and pushed the satellite label clarification as `3238086`; worktree is clean.
- Adding an OpenStreetMap-derived OpenFreeMap vector detail overlay at place-level zoom so roads and mapped buildings appear over the satellite composite.
- Documented the OSM/OpenFreeMap detail layer and its coverage limitation in `README.md`.
- Committed and pushed the vector overlay as `8ead10c`; the application worktree is clean.
- Added place and street-name labels using OpenFreeMap glyphs and documented the source, zoom thresholds, attribution, and raster-tile dead end in `docs/02-data-sources.md`.
- Committed and pushed the label/documentation work as `fd03c1e`; the worktree is clean.
- Initial Vercel deployment succeeded at `https://kasa-mu-seven.vercel.app`, but `/api/chat` returned `FUNCTION_INVOCATION_FAILED`; logs identified missing ESM `.js` extensions in server imports.
- Fixed the Vercel ESM imports in commit `dd981ac`, configured Production variables `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` without storing their values in the repository, and redeployed successfully.
- Production site responds at `https://kasa-mu-seven.vercel.app`; `GET /api/chat` returns `{"configured":true,...}`.
- Started a visual polish pass for the globe home screen: a glass field-station panel, stronger hierarchy, source cues, demo chips, and a subtle vignette.
- `npm test` passed 25 tests and `npm run build` passed for the redesign.
- Lowered street-name labels to zoom 9 so they appear during the normal place view instead of requiring a deeper manual zoom.
- Typecheck passed; committed and pushed the adjustment as `6526925`; the worktree is clean.

## NEXT STEP (do this first)
Restore generated build metadata, commit and push the redesigned home screen, then redeploy Vercel.

## Uncommitted / Half-Finished Work
Home-screen redesign and memory updates are uncommitted; `tsconfig.tsbuildinfo` is generated noise and must be restored before commit.

## Recovery Plan (only if a risky op is running)
<!-- Before any long/risky operation, write here what is about to happen and
     how to undo it. Delete this section when the operation completes cleanly. -->

## Blockers
Deployment target/public URL, demo video, and Space Apps submission remain unresolved under issue #8.

## Last Updated
2026-11-15 14:27 by copilot
