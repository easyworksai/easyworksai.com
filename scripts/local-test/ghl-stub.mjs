import http from 'node:http';
const opps = {}; const events = []; const contacts = []; let n = 0; const calls = []; const tg = []; let tgDown = false; let down = false;
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
http.createServer(async (req, res) => {
  let raw = ''; for await (const ch of req) raw += ch; const body = raw ? JSON.parse(raw) : {};
  const u = new URL(req.url, 'http://x'); const p = u.pathname;
  if (p === '/__calls') return send(res, 200, calls);
  if (p === '/__tg') return send(res, 200, tg);
  if (p === '/__tgdown') { tgDown = !!body.down; return send(res, 200, { tgDown }); }
  if (/^\/bot[^/]+\/sendMessage$/.test(p)) { if (tgDown) return send(res, 500, { ok: false }); tg.push(body.text); return send(res, 200, { ok: true }); } // fake Telegram
  if (p === '/__down') { down = !!body.down; return send(res, 200, { down }); }
  if (p.startsWith('/__set/')) { Object.assign(opps[p.slice(7)] || {}, body); return send(res, 200, opps[p.slice(7)] || null); }
  if (p === '/__add') { const id = 'ext-' + (++n); opps[id] = { id, pipelineId: body.pipelineId || 'FtnFKVIUyAh7NLy6Hgpt', pipelineStageId: body.pipelineStageId, status: 'open', contactId: 'cx', name: body.name || 'External' }; return send(res, 200, opps[id]); }
  if (p === '/__seed') { (body.events || []).forEach((e) => events.push(e)); (body.contacts || []).forEach((c) => contacts.push(c));
    (body.opps || []).forEach((o) => { opps[o.id] = { pipelineId: 'FtnFKVIUyAh7NLy6Hgpt', status: 'open', ...o }; }); return send(res, 200, { ok: true }); }
  calls.push(`${req.method} ${p}`);
  if (down) return send(res, 500, { error: 'down' });
  if (req.method === 'POST' && p === '/contacts/upsert') return send(res, 200, { contact: { id: 'c-' + (++n) } });
  if (req.method === 'POST' && /^\/contacts\/[^/]+\/(tags|notes)$/.test(p)) return send(res, 200, {});
  if (req.method === 'GET' && p === '/calendars/') return send(res, 200, { calendars: [{ id: 'cal-1', name: 'Discovery Call', isActive: true }, { id: 'cal-2', name: 'Demo Call', isActive: true }, { id: 'cal-off', name: 'Old Calendar', isActive: false }] });
  if (req.method === 'GET' && p === '/calendars/events') { const a = +u.searchParams.get('startTime'), z = +u.searchParams.get('endTime'), cid = u.searchParams.get('calendarId');
    return send(res, 200, { events: events.filter((e) => e.calendarId === cid && new Date(e.startTime) >= a && new Date(e.startTime) < z) }); }
  if (req.method === 'POST' && p === '/contacts/search') return send(res, 200, { contacts, total: contacts.length });
  if (req.method === 'GET' && p === '/contacts/') return send(res, 200, { contacts: [] });
  if (req.method === 'POST' && p === '/opportunities/') { const id = 'o-' + (++n); opps[id] = { id, ...body }; return send(res, 200, { opportunity: opps[id] }); }
  if (req.method === 'GET' && p === '/opportunities/search') return send(res, 200, { opportunities: Object.values(opps).filter((o) => u.searchParams.get('status') !== 'open' || (o.status || 'open') === 'open') });
  const m = p.match(/^\/opportunities\/([^/]+)$/);
  if (m && req.method === 'PUT') { if (!opps[m[1]]) return send(res, 404, {}); Object.assign(opps[m[1]], body); return send(res, 200, { opportunity: opps[m[1]] }); }
  if (m && req.method === 'GET') return opps[m[1]] ? send(res, 200, { opportunity: opps[m[1]] }) : send(res, 404, {});
  send(res, 404, { error: 'stub: no route' });
}).listen(8898, () => console.log('ghl stub on 8898'));
