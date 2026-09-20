// Nightly safety net for ghl-stage-hook: compare every Floor claim with its GHL opportunity and fix drift.
// Same quiet rules as the hook (no XP, no wire, no amounts). Does nothing when nothing has drifted.
// Runs on Netlify's scheduler (not reachable by URL in production). 10:00 UTC = 3am Vancouver.
import { getStore } from '@netlify/blobs';
import { listPipelineOpportunities, ghlReady } from './ghl.mjs';
import { syncClaimFromOpp } from './ghl-stage-hook.mjs';
import { tgPing } from './team-events.mjs';

export const config = { schedule: '0 10 * * *' };
const store = () => getStore({ name: 'sales-team', consistency: 'strong' });

export default async () => {
  if (!ghlReady()) return Response.json({ ok: false, skipped: 'ghl not configured' });
  const opps = await listPipelineOpportunities();
  if (!opps) { console.log('ghl-stage-reconcile skipped: ghl not reachable'); return Response.json({ ok: false, skipped: 'ghl not reachable' }); } // never "fix" anything off a failed read
  const byId = Object.fromEntries(opps.map((o) => [o.id, o]));

  const claims = (await store().get('leads-claims.json', { type: 'json' })) || {};
  const fixed = [], won = [];
  for (const [leadId, c] of Object.entries(claims)) {
    const opp = c.oppId && byId[c.oppId];
    if (!opp) continue; // deleted in GHL or never synced: leave the Floor's view alone
    const res = syncClaimFromOpp(c, opp);
    if (res.from !== res.to) fixed.push(`${opp.name || leadId}: ${res.from} -> ${res.to}`);
    if (res.won) won.push(`${opp.name || leadId} (rep: ${c.slug})`);
  }
  if (fixed.length || won.length) {
    // Re-read and re-apply on the fresh copy so a rep's write during the GHL fetch is not lost.
    const fresh = (await store().get('leads-claims.json', { type: 'json' })) || {};
    for (const [leadId, c] of Object.entries(fresh)) {
      const opp = c.oppId && byId[c.oppId];
      if (opp) syncClaimFromOpp(c, opp);
    }
    await store().setJSON('leads-claims.json', fresh);
    const lines = [];
    if (fixed.length) lines.push(`<b>Floor synced to GHL</b> (${fixed.length})\n` + fixed.slice(0, 12).join('\n'));
    if (won.length) lines.push(`<b>Won in GHL, no build amount on The Floor</b>\n` + won.slice(0, 12).join('\n'));
    await tgPing('\u{1F501} ' + lines.join('\n\n'));
  }
  const summary = { ok: true, checked: Object.keys(claims).length, fixed: fixed.length, won: won.length };
  console.log('ghl-stage-reconcile', JSON.stringify(summary)); // scheduled runs return no body: the log is the record
  return Response.json(summary);
};
