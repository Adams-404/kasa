# DEAD ENDS

> Append-only. Record a FAILED approach the moment it fails.
> The next agent must be able to skip these without re-investigating.
> If you spent more than 10 minutes on something that did not work, log it here.

## DE-001
- Date: YYYY-MM-DD
- Tried:
- Where: <!-- file, function, command -->
- Result:
- Why it failed:
- Do NOT retry because:
- Logged by: <agent-name>

## DE-002
- Date: 2026-11-15
- Tried: Add `https://tile.openstreetmap.org/{z}/{x}/{y}.png` as a browser raster overlay.
- Where: `src/lib/gibs.ts`, `src/lib/mapStyle.ts`
- Result: The tile endpoint responded with `x-blocked: Access denied` during verification.
- Why it failed: The public OSM tile service requires usage-policy-compliant identification that a browser tile request cannot reliably provide.
- Do NOT retry because: Direct browser requests risk violating OSM tile policy; use a provider intended for browser map tiles or a self-hosted/proxied service instead.
- Logged by: copilot

<!--
### Example

## DE-002
- Date: 2026-10-14
- Tried: Caching session tokens in Redis with a 24h TTL
- Where: src/auth/cache.ts, `storeSession()`
- Result: Users randomly logged out mid-session
- Why it failed: Redis evicts under memory pressure; no LRU protection configured
- Do NOT retry because: upstream instance limits eviction policy config
- Logged by: opencode
-->
