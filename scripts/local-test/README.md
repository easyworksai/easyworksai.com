# Local tests for the GHL stage sync. Sandbox only, never production.

1. `node scripts/local-test/ghl-stub.mjs` (fake GHL on 8898)
2. `netlify dev --offline --port 8899` with env: `TEAM_LINK_SECRET`, `GHL_EASYWORKS_PIT_TOKEN=dummy`, `GHL_API_BASE=http://localhost:8898`, `GHL_HOOK_SECRET=local-hook`, `TELEGRAM_BOT_TOKEN=dummy`
3. Seed `leads-pool.json` (ids L1..L6) into `.netlify/blobs-serve/entries/<site>/site:sales-team/`, add a test rep as admin
4. `REP_CODE=<test rep code> bash scripts/local-test/smoke-ghl-stage-hook.sh`

`GHL_API_BASE` exists only for this. Production never sets it.
