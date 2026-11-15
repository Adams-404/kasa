# DECISIONS

> Append-only. Record a decision at the moment it is made, not later.
> Every entry needs a REASON and the alternatives that were rejected.
> A decision with no reason is just a preference and will be re-litigated.

## D-001
- Date: YYYY-MM-DD
- Decision:
- Reason:
- Alternatives rejected:
  -  — why rejected:
- Affects:

## D-002
- Date: 2026-11-15
- Decision: Implement the offline demo pack as checked-in NASA POWER monthly data seeded through the existing cache keys.
- Reason: This makes the challenge-critical trend analysis work without a network while preserving one code path for live and demo requests.
- Alternatives rejected:
  - Add a separate offline UI/data path: rejected because it would duplicate trend loading behavior and risk diverging from live results.
  - Bundle imagery tiles and all optional panels: rejected because it would make the repository and build much larger; imagery/history/news remain honest network-dependent states.
- Affects: `src/lib/demoPack.ts`, `src/lib/cache.ts`, `src/main.tsx`, `src/lib/demo-pack.json`

<!--
### Format
Copy the block above, bump the number, append to the BOTTOM of this file.
Do not delete or rewrite old entries. Supersede instead:

## D-014
- Date: YYYY-MM-DD
- Decision: Switched auth from X to Y
- Supersedes: D-007
- Reason:
- Alternatives rejected:
-->
