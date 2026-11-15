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

## NEXT STEP (do this first)
Commit the demo-pack implementation and memory updates, excluding generated `tsconfig.tsbuildinfo`.

## Uncommitted / Half-Finished Work
Demo-pack implementation, test, README, and memory updates are uncommitted. `tsconfig.tsbuildinfo` is a generated local change and must not be committed.

## Recovery Plan (only if a risky op is running)
<!-- Before any long/risky operation, write here what is about to happen and
     how to undo it. Delete this section when the operation completes cleanly. -->

## Blockers
Deployment target/public URL, demo video, and Space Apps submission remain unresolved under issue #8.

## Last Updated
2026-11-15 12:46 by copilot
