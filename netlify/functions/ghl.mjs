// Shared GoHighLevel bridge for The Floor. One place all GHL reads/writes go through,
// so the platform and the CRM stay in unison with no duplicated logic.
// Reads reuse the SAME 5-min contact cache team-stats writes ('contacts-cache.json').
// Writes are best-effort: a GHL hiccup must never block a rep's action on The Floor.
import { getStore } from '@netlify/blobs';

// GHL_API_BASE is only ever set for local tests against a stub. Production never sets it.
const BASE = process.env.GHL_API_BASE || 'https://services.leadconnectorhq.com';
const VER = '2021-07-28';
export const GHL_TOKEN = process.env.GHL_EASYWORKS_PIT_TOKEN || '';
export const GHL_LOC = process.env.GHL_EASYWORKS_LOCATION_ID || 'epCxi4CaxbM1sOwVjBTf';
export const ghlReady = () => !!GHL_TOKEN;

const H = () => ({ Authorization: `Bearer ${GHL_TOKEN}`, Version: VER, Accept: 'application/json' });
const store = () => getStore({ name: 'sales-team', consistency: 'strong' });

// Reuse team-stats' cache so we never double-pull contacts.
export async function fetchContacts() {
  const s = store();
  const cached = await s.get('contacts-cache.json', { type: 'json' });
  if (cached && Date.now() - cached.ts < 5 * 60 * 1000) return cached.contacts;
  const contacts = [];
  let url = `${BASE}/contacts/?locationId=${GHL_LOC}&limit=100`;
  for (let page = 0; page < 10; page++) {
    const r = await fetch(url, { headers: H() });
    if (!r.ok) break;
    const j = await r.json();
    const batch = (j.contacts || []).map((c) => ({ tags: c.tags || [], added: c.dateAdded || null }));
    contacts.push(...batch);
    const next = j.meta && j.meta.nextPageUrl;
    if (!next || !(j.contacts || []).length) break;
    url = next;
  }
  await s.setJSON('contacts-cache.json', { ts: Date.now(), contacts });
  return contacts;
}

export const countTag = (contacts, tag) => contacts.filter((c) => (c.tags || []).includes(tag)).length;
export const countTagSince = (contacts, tag, ts) =>
  contacts.filter((c) => (c.tags || []).includes(tag) && c.added && new Date(c.added).getTime() >= ts).length;

// Upsert a Floor lead into GHL as a contact. Returns the contact id, or null on failure.
export async function upsertContact({ name, phone, email, tags = [], source = 'The Floor' }) {
  if (!ghlReady()) return null;
  try {
    // Tags are added AFTER the upsert: tags passed to upsert replace the contact's existing tags.
    const body = { locationId: GHL_LOC, name: name || undefined, phone: phone || undefined,
      email: email || undefined, source };
    const r = await fetch(`${BASE}/contacts/upsert`, {
      method: 'POST', headers: { ...H(), 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const cid = (j.contact && j.contact.id) || j.id || null;
    if (cid && tags.length) await fetch(`${BASE}/contacts/${cid}/tags`, { method: 'POST', headers: { ...H(), 'Content-Type': 'application/json' }, body: JSON.stringify({ tags }) }).catch(() => {});
    return cid;
  } catch { return null; }
}

export async function addTags(contactId, tags = []) {
  if (!ghlReady() || !contactId || !tags.length) return false;
  try {
    const r = await fetch(`${BASE}/contacts/${contactId}/tags`, {
      method: 'POST', headers: { ...H(), 'Content-Type': 'application/json' }, body: JSON.stringify({ tags }),
    });
    return r.ok;
  } catch { return false; }
}

// Easyworks Sales Pipeline — the rep's whole pipeline lives here, mirrored from The Floor.
export const PIPELINE_ID = process.env.GHL_PIPELINE_ID || 'FtnFKVIUyAh7NLy6Hgpt';
export const STAGE = {
  new: '89707cb7-632a-4e36-b65c-79f94566a5f0',       // New Lead
  contacted: '141829e9-7a54-4978-bab7-d29c456e552b', // Contacted
  meeting: 'e297db98-c2c5-470d-a5a2-b3f98c59a51c',   // Demo Booked
  proposal: 'bef55bb8-9f2c-475b-ae22-53c3a4de97ba',  // Proposal Sent (Blueprint sold)
  won: '3f082382-70ab-4f65-8631-989a4176c3ab',       // Won (build closed)
  lost: '1eae97f4-01ab-4c6d-87b0-d1a12157d256',       // Lost (dead)
};

// Create a pipeline opportunity for a deal. Returns the opportunity id, or null.
export async function createOpportunity({ name, contactId, stageId, monetaryValue = 0, status = 'open' }) {
  if (!ghlReady() || !contactId) return null;
  try {
    const body = { pipelineId: PIPELINE_ID, locationId: GHL_LOC, name: name || 'Floor lead',
      pipelineStageId: stageId, status, contactId, monetaryValue };
    const r = await fetch(`${BASE}/opportunities/`, {
      method: 'POST', headers: { ...H(), 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return (j.opportunity && j.opportunity.id) || j.id || null;
  } catch { return null; }
}

// Move/value an existing opportunity (stage, monetaryValue, status, name). Best-effort.
export async function updateOpportunity(oppId, fields = {}) {
  if (!ghlReady() || !oppId) return false;
  try {
    const body = { pipelineId: PIPELINE_ID };
    if (fields.stageId) body.pipelineStageId = fields.stageId;
    if (fields.monetaryValue != null) body.monetaryValue = fields.monetaryValue;
    if (fields.status) body.status = fields.status;
    if (fields.name) body.name = fields.name;
    const r = await fetch(`${BASE}/opportunities/${oppId}`, {
      method: 'PUT', headers: { ...H(), 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return r.ok;
  } catch { return false; }
}

export async function addNote(contactId, noteBody) {
  if (!ghlReady() || !contactId || !noteBody) return false;
  try {
    const r = await fetch(`${BASE}/contacts/${contactId}/notes`, {
      method: 'POST', headers: { ...H(), 'Content-Type': 'application/json' }, body: JSON.stringify({ body: noteBody }),
    });
    return r.ok;
  } catch { return false; }
}

// Read one opportunity straight from GHL. Returns { id, pipelineId, stageId, status, contactId, name } or null.
export async function getOpportunity(oppId) {
  if (!ghlReady() || !oppId) return null;
  try {
    const r = await fetch(`${BASE}/opportunities/${encodeURIComponent(oppId)}`, { headers: H() });
    if (!r.ok) return null;
    const j = await r.json();
    return shapeOpp(j.opportunity || j);
  } catch { return null; }
}

// Every opportunity in the sales pipeline (all statuses), paged. Returns null if GHL could not be read at all.
export async function listPipelineOpportunities() {
  if (!ghlReady()) return null;
  const out = [];
  try {
    for (let page = 1; page <= 20; page++) {
      const r = await fetch(`${BASE}/opportunities/search?location_id=${GHL_LOC}&pipeline_id=${PIPELINE_ID}&status=all&limit=100&page=${page}`, { headers: H() });
      if (!r.ok) return page === 1 ? null : out;
      const j = await r.json();
      const batch = j.opportunities || [];
      out.push(...batch.map(shapeOpp));
      if (batch.length < 100) break;
    }
  } catch { return out.length ? out : null; }
  return out;
}

const shapeOpp = (o) => ({ id: o.id, pipelineId: o.pipelineId, stageId: o.pipelineStageId, status: o.status || 'open',
  contactId: o.contactId || (o.contact && o.contact.id) || null, name: o.name || '' });

// Generic read for anything not wrapped above. Returns { ok, status, json }. Never throws.
export async function ghlFetch(path, { method = 'GET', body } = {}) {
  if (!ghlReady()) return { ok: false, status: 0, json: null };
  try {
    const r = await fetch(`${BASE}${path}`, { method, headers: { ...H(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined });
    return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) };
  } catch { return { ok: false, status: 0, json: null }; }
}
