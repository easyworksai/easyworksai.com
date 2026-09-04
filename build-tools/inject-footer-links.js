// Adds "Locations" and "Industries" columns to the footer on every page
// that contains <h4>Company</h4>. Uses absolute paths (/locations/, /industries/)
// so it works at every depth.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const NEW_COLUMNS = `<div class="footer-col"><h4>Locations</h4><a href="/locations/vancouver/">Vancouver</a><a href="/locations/surrey/">Surrey</a><a href="/locations/burnaby/">Burnaby</a><a href="/locations/langley/">Langley</a><a href="/locations/abbotsford/">Abbotsford</a><a href="/locations/chilliwack/">Chilliwack</a><a href="/locations/squamish/">Squamish</a><a href="/locations/whistler/">Whistler</a><a href="/locations/">All BC cities →</a></div>
<div class="footer-col"><h4>Industries</h4><a href="/industries/ai-for-dentists-bc/">AI for Dentists (BC)</a><a href="/industries/ai-for-physio-bc/">AI for Physiotherapy (BC)</a><a href="/industries/ai-for-spas-bc/">AI for Spas + Med-Spas (BC)</a><a href="/industries/real-estate/">Real Estate Teams</a><a href="/industries/law/">Law Firms</a><a href="/industries/financial/">Mortgage, Insurance, Advisors</a><a href="/industries/home-services/">Home Services</a><a href="/industries/dealerships/">Auto Dealerships</a><a href="/industries/">All industries →</a></div>
`;

const files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.git', 'build-tools', 'netlify'].includes(e.name)) continue;
      walk(p);
    } else if (e.name === 'index.html' || e.name.endsWith('.html')) {
      files.push(p);
    }
  }
}
walk(ROOT);

let modified = 0, skipped = 0;
for (const f of files) {
  let html = fs.readFileSync(f, 'utf8');
  if (!html.includes('<h4>Company</h4>')) { skipped++; continue; }
  if (html.includes('<h4>Locations</h4>')) { skipped++; continue; } // already injected

  // Match the "Company" footer-col block — handle both one-line and multi-line variants.
  // Two patterns we know:
  //   A) <div class="footer-col"><h4>Company</h4>...  (subpage style)
  //   B) <div class="footer-col">\n        <h4>Company</h4>...  (homepage style)
  const updated = html.replace(
    /(<div class="footer-col">\s*<h4>Company<\/h4>)/,
    NEW_COLUMNS + '$1'
  );

  if (updated === html) { skipped++; continue; }
  fs.writeFileSync(f, updated);
  modified++;
  console.log('  injected: ' + path.relative(ROOT, f));
}

console.log(`\nDone. ${modified} files updated, ${skipped} skipped.`);
