// Shared GoHighLevel bridge for The Floor. One place all GHL reads/writes go through,
// so the platform and the CRM stay in unison with no duplicated logic.
// Reads reuse the SAME 5-min contact cache team-stats writes ('contacts-cache.json').
// Writes are best-effort: a GHL hiccup must never block a rep's action on The Floor.
import { getStore } from '@netlify/blobs';

const BASE = 'https://services.leadconnectorhq.com';
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
    const body = { locationId: GHL_LOC, name: name || undefined, phone: phone || undefined,
      email: email || undefined, tags, source };
    const r = await fetch(`${BASE}/contacts/upsert`, {
      method: 'POST', headers: { ...H(), 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return (j.contact && j.contact.id) || j.id || null;
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
  proposal: 'bef55bb8-9f2c-475b-ae22-53c3a4de97ba',  // Proposal Sent (audit sold)
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
