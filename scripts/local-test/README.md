# Local tests for the GHL stage sync. Sandbox only, never production.

1. `node scripts/local-test/ghl-stub.mjs` (fake GHL on 8898)
2. `netlify dev --offline --port 8899` with env: `TEAM_LINK_SECRET`, `GHL_EASYWORKS_PIT_TOKEN=dummy`, `GHL_API_BASE=http://localhost:8898`, `GHL_HOOK_SECRET=local-hook`, `TELEGRAM_BOT_TOKEN=dummy`
3. Seed `leads-pool.json` (ids L1..L6) into `.netlify/blobs-serve/entries/<site>/site:sales-team/`, add a test rep as admin
4. `REP_CODE=<test rep code> bash scripts/local-test/smoke-ghl-stage-hook.sh`

5. Today panel: `ADMIN_CODE=.. EA_CODE=.. TECH_CODE=.. REP_CODE=.. bash scripts/local-test/smoke-team-today.sh` (fresh stub, delete `today-cache.json` first)
6. Handoffs, gate, stale/overdue, shift report: same codes, `bash scripts/local-test/smoke-handoffs.sh` (also set `TELEGRAM_API_BASE=http://localhost:8898`, the stub fakes Telegram)

macOS bash is 3.2: never nest `\"$VAR\"` inside `"$(...)"` in these scripts. Capture into `R` first.

`GHL_API_BASE` and `TELEGRAM_API_BASE` exist only for this. Production never sets it.
