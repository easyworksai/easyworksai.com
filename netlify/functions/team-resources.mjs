// Tech resources (the SOP library) for The Bench. Cookie-gated: any active member can read.
// GET ?list=1        -> manifest of docs
// GET ?file=<code>   -> the PDF, inline
// Files live in team/resources-private/ (blocked from static serving via _redirects, shipped with the function via included_files).
import { cookieSlug, loadRoster } from './team-auth.mjs';
import fs from 'node:fs';
import path from 'node:path';

const DIR_CANDIDATES = [
  path.join(process.cwd(), 'team', 'resources-private'),
  new URL('../../team/resources-private/', import.meta.url).pathname,
];
function dir() { for (const d of DIR_CANDIDATES) if (fs.existsSync(d)) return d; return DIR_CANDIDATES[0]; }

export default async (req) => {
  const slug = cookieSlug(req);
  if (!slug) return Response.json({ error: 'login required' }, { status: 401 });
  const roster = await loadRoster();
  const me = roster.find((r) => r.slug === slug && r.active);
  if (!me) return Response.json({ error: 'login required' }, { status: 401 });
  const u = new URL(req.url);
  let manifest = [];
  try { manifest = JSON.parse(fs.readFileSync(path.join(dir(), 'manifest.json'), 'utf8')); } catch { manifest = []; }
  if (u.searchParams.get('list')) return Response.json({ docs: manifest.filter((d) => d.published !== false) });
  const code = String(u.searchParams.get('file') || '').toUpperCase();
  const doc = manifest.find((d) => d.code === code && d.published !== false);
  if (!doc) return Response.json({ error: 'not found' }, { status: 404 });
  const p = path.join(dir(), path.basename(doc.file));
  if (!fs.existsSync(p)) return Response.json({ error: 'file missing' }, { status: 404 });
  return new Response(fs.readFileSync(p), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${path.basename(doc.file)}"`, 'Cache-Control': 'private, max-age=300' } });
};
