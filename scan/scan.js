// The Easyworks Scan, front end. Intro -> six questions -> checks run -> result -> email gate -> full report.
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const track = (name, params) => { try { window.gtag && gtag('event', name, Object.assign({}, typeof campParams === 'function' ? campParams() : {}, params || {})); } catch (e) {} };
  const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-CA');
  const JOB_DEFAULT = { dentist: 650, physio: 480, medspa: 540, spa: 180, trades: 2400, realestate: 9000, restaurant: 45, other: 400 };
  // The four vital signs the Scan reads (brand vocabulary). Connection + Immunity
  // are the Blueprint's deeper read.
  const PILLAR_LABEL = { found: 'Voice', answered: 'Reflexes', trusted: 'Circulation', growing: 'Autonomy' };

  const state = { industry: 'other', quiz: {}, rec: null };

  // Campaign tags: keep the first utm_* / click id we see this session so the lead carries its ad cell.
  const CAMP_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
  const camp = (() => {
    let c = {};
    try { c = JSON.parse(sessionStorage.getItem('ew_camp') || '{}'); } catch (e) {}
    const q = new URLSearchParams(location.search);
    CAMP_KEYS.forEach((k) => { const v = q.get(k); if (v && !c[k]) c[k] = v.slice(0, 120); });
    try { sessionStorage.setItem('ew_camp', JSON.stringify(c)); } catch (e) {}
    return c;
  })();
  const campParams = () => ({ campaign: camp.utm_campaign || '', source: camp.utm_source || '', medium: camp.utm_medium || '' });
  const sections = { intro: $('#s-intro'), quiz: $('#s-quiz'), run: $('#s-run'), result: $('#s-result') };
  const show = (k) => { Object.entries(sections).forEach(([n, el]) => { el.hidden = n !== k; }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // ---- intro -----------------------------------------------------------------------
  $$('#industry .chip').forEach((c) => c.addEventListener('click', () => {
    $$('#industry .chip').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    c.setAttribute('aria-pressed', 'true'); state.industry = c.dataset.v;
    $('#jobv').placeholder = JOB_DEFAULT[state.industry];
  }));
  const preI = new URLSearchParams(location.search).get('i');
  if (preI && JOB_DEFAULT[preI]) { const chip = $('#industry .chip[data-v="' + preI + '"]'); if (chip) chip.click(); }
  $('#introForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const biz = $('#biz').value.trim(), url = $('#url').value.trim();
    if (!biz && !url) { const er = $('#introErr'); er.textContent = 'Give us a business name or a website.'; er.style.display = 'block'; return; }
    track('scan_start', { industry: state.industry, has_site: !!url });
    $('#jobv').placeholder = JOB_DEFAULT[state.industry];
    goQ(0); show('quiz');
  });

  // ---- quiz --------------------------------------------------------------------------
  const qs = $$('#s-quiz .q'); let qi = 0;
  function goQ(i) {
    qi = Math.max(0, Math.min(qs.length - 1, i));
    qs.forEach((q, n) => q.classList.toggle('on', n === qi));
    $('#prog').style.width = ((qi) / (qs.length - 1)) * 100 + '%';
    $('#qCount').textContent = qi < qs.length - 1 ? `${qi + 1} of ${qs.length - 1}` : 'Last one';
    $('#qBack').style.visibility = qi === 0 ? 'hidden' : 'visible';
  }
  qs.forEach((q) => $$('.opt', q).forEach((o) => o.addEventListener('click', () => {
    $$('.opt', q).forEach((x) => x.setAttribute('aria-pressed', 'false'));
    o.setAttribute('aria-pressed', 'true');
    state.quiz[q.dataset.k] = o.dataset.v;
    setTimeout(() => goQ(qi + 1), 180);
  })));
  $('#qBack').addEventListener('click', () => goQ(qi - 1));
  $('#runBtn').addEventListener('click', runScan);
  $('#jobv').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); runScan(); } });

  // ---- run -----------------------------------------------------------------------------
  async function runScan() {
    const missing = ['missed', 'reply', 'posting', 'reviews', 'ads', 'hours'].filter((k) => !state.quiz[k]);
    if (missing.length) { goQ(qs.findIndex((q) => q.dataset.k === missing[0])); return; }
    track('scan_quiz_done', { industry: state.industry });
    const name = $('#biz').value.trim(), url = $('#url').value.trim(), city = $('#city').value.trim();
    $('#runName').textContent = name || url;
    show('run');
    const chk = $$('.chk'); chk.forEach((c) => c.classList.remove('run', 'done'));
    let step = 0; const tick = () => { if (step > 0) chk[step - 1].classList.replace('run', 'done'); if (step < chk.length) chk[step].classList.add('run'); step++; };
    tick(); const timer = setInterval(() => { if (step < chk.length) tick(); }, 2600);
    try {
      const r = await fetch('/api/scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, url, city, industry: state.industry, quiz: state.quiz, job: $('#jobv').value.trim() }) });
      const rec = await r.json();
      clearInterval(timer);
      if (!r.ok) throw new Error(rec.error || 'Scan failed');
      chk.forEach((c) => { c.classList.remove('run'); c.classList.add('done'); });
      state.rec = rec;
      history.replaceState(null, '', '?r=' + rec.id);
      setTimeout(() => { render(rec); if (rec.pending && (rec.pending.speed || rec.pending.bench)) pollSpeed(rec.id, 0); }, 500);
    } catch (e) {
      clearInterval(timer);
      const er = $('#runErr'); er.textContent = e.message + '. Go back and try again.'; er.style.display = 'block';
      setTimeout(() => show('quiz'), 2500);
    }
  }

  // ---- result ----------------------------------------------------------------------------
  function render(rec) {
    const res = rec.result, inp = rec.input;
    show('result');
    track('scan_complete', { score: res.score, band: res.band, industry: inp.industry, leak: res.money.monthly });
    $('#bandTxt').textContent = res.band;
    $('#bizLine').textContent = [inp.name, inp.city].filter(Boolean).join(' · ') + (inp.url ? ' · ' + inp.url.replace(/^https?:\/\//, '') : '');
    // dial + counters
    requestAnimationFrame(() => { $('#arc').style.strokeDashoffset = 326.7 * (1 - res.score / 100); });
    const dur = 1200, t0 = performance.now();
    const step = (t) => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); $('#scoreN').textContent = Math.round(res.score * e); $('#moneyN').innerHTML = money(res.money.monthly * e) + ' <small>/ month</small>'; if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
    // leaks (money first, fall back to worst findings)
    const leaks = res.money.leaks.slice(0, 3);
    $('#leaks').innerHTML = leaks.length ? leaks.map((l) => `<div class="leak"><div><b>${l.label}</b><p>${l.line}</p></div><span class="amt">${money(l.amount)}/mo</span></div>`).join('')
      : res.worst.map((w) => `<div class="leak"><div><b>${w.label}</b><p>${w.fix}</p></div><span class="amt"></span></div>`).join('') || '<div class="leak"><div><b>Nothing major leaking.</b><p>The Blueprint is where we find the next 20%.</p></div></div>';
    $('#pillars').innerHTML = Object.entries(res.pillars).map(([k, p]) => `<div class="pillar"><div class="k">${PILLAR_LABEL[k] || k}</div><div class="v">${p.score}<span style="font-size:13px;color:var(--dim)">/${p.weight}</span></div><div class="bar"><i style="width:${Math.round((p.score / p.weight) * 100)}%"></i></div></div>`).join('');
    const a = res.money.assumptions;
    $('#assumpTxt').textContent = `Conservative estimate from your answers and ${a.industry.toLowerCase()} averages: about ${a.leadsPerMonth} enquiries a month, ${Math.round(a.closeRate * 100)}% become customers, ${money(a.jobValue)} per customer. We count 4 in 10 missed calls as new customers, and a third of those as lost for good. Slow replies apply to the 4 in 10 enquiries that arrive by form, text or email, and lose 10% to 55% of them depending on speed. Untracked ads count a quarter as waste. Owner admin hours over three a week at $45.${a.capped ? ` The total is capped at ${Math.round((a.capPct || 0.35) * 100)}% of the estimated ${money(a.revenueEst)} a month, so it stays believable.` : ''} Anything marked Could not check does not count for or against your Rating. The Blueprint replaces all of this with your real numbers.`;
    // report body
    const groups = { found: [], answered: [], trusted: [], growing: [] };
    res.findings.forEach((f) => (groups[f.pillar] || groups.found).push(f));
    Object.entries(groups).forEach(([k, arr]) => { const el = $('#r-' + k); if (el) el.innerHTML = arr.map((f) => `<div class="finding"><span class="s ${f.status}"></span><div><b>${f.label}</b>${f.status === 'unknown' ? '<span class="tagq">Could not check</span>' : ''}${f.status !== 'pass' ? `<p>${f.fix}</p>` : ''}</div></div>`).join(''); });
    $('#shareUrl').textContent = location.origin + '/scan/?r=' + rec.id;
    const bi = $('#bpInfo'); if (bi) bi.href = '/blueprint/?r=' + encodeURIComponent(rec.id);
    const bp = $('#bpBtn'); bp.href = '../?scan=' + encodeURIComponent(rec.id) + '#start'; bp.onclick = () => { track('blueprint_click', { score: res.score, band: res.band }); try { sessionStorage.setItem('ew_scan', JSON.stringify({ id: rec.id, score: res.score, leak: res.money.monthly, name: inp.name, url: inp.url })); } catch (e) {} };
    if (rec.unlocked) { $('#gate').style.display = 'none'; $('#report').classList.add('on'); }
    // v2: the local competitor benchmark (lands from the background job) and the two Blueprint-only
    // vitals as honest previews. Polling is started once by the caller, not here, so a repaint
    // never spawns a second poll chain.
    const bm = rec.checks && rec.checks.benchmark, pv = res.previews || {}, pend = rec.pending || {};
    const benchEl = $('#bench');
    if (benchEl) benchEl.innerHTML = [
      bm && bm.of ? `<div class="leak"><div><b>You rank #${bm.rank} of ${bm.of} nearby ${bm.typeLabel || 'businesses'} on Google</b><p>${bm.leader ? `The leader, ${bm.leader.name}, has ${bm.leader.reviews} reviews at ${bm.leader.rating} stars. You have ${bm.you.reviews} at ${bm.you.rating || 'no rating'}.` : 'You lead your area on reviews. The job now is keeping it that way.'}</p></div></div>`
        : (pend.bench ? `<div class="leak"><div><b>Checking your local competitors</b><p>Ranking you against the nearby businesses you actually compete with on Google.</p></div></div>` : ''),
      pv.connection ? `<div class="leak"><div><b>Connection: ${pv.connection.found} of ${pv.connection.of} systems found on your site</b><p>Booking, chat, forms, click to call, CRM. The Blueprint checks whether they talk to each other.</p></div></div>` : '',
      pv.immunity ? `<div class="leak"><div><b>Immunity: ${pv.immunity.found} of ${pv.immunity.of} foundations in place</b><p>The basics that keep a business ready for what is coming. Scored in full in the Blueprint.</p></div></div>` : '',
    ].join('');
  }
  // The deep checks (measured speed, local benchmark) land in the background. Poll the record, paint
  // whatever has arrived, and stop once the job has cleared both pending flags (or after ~80 s).
  function pollSpeed(id, n) {
    if (n > 14) return;
    setTimeout(async () => {
      try {
        const r = await fetch('/api/scan?r=' + encodeURIComponent(id)); if (!r.ok) return;
        const rec = await r.json();
        state.rec = rec; render(rec);
        const p = rec.pending || {};
        if (!p.speed && !p.bench) return;
      } catch (e) {}
      pollSpeed(id, n + 1);
    }, n === 0 ? 6000 : 5000);
  }

  // ---- gate ----------------------------------------------------------------------------------
  $('#gateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#gateForm button[type=submit]'); btn.disabled = true;
    const er = $('#gateErr'); er.style.display = 'none';
    try {
      const r = await fetch('/api/scan-lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: state.rec.id, email: $('#gemail').value, phone: $('#gphone').value, name: $('#gname').value, smsOk: !!($('#gsms') && $('#gsms').checked), camp }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not open the report');
      track('generate_lead', { method: 'scan_gate', score: state.rec.result.score, band: state.rec.result.band, has_phone: !!$('#gphone').value });
      $('#gate').style.display = 'none'; $('#report').classList.add('on');
      $('#report').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) { er.textContent = err.message; er.style.display = 'block'; btn.disabled = false; }
  });

  // ---- deep link ?r=id -------------------------------------------------------------------------
  const rid = new URLSearchParams(location.search).get('r');
  if (rid) {
    fetch('/api/scan?r=' + encodeURIComponent(rid)).then((r) => (r.ok ? r.json() : null)).then((rec) => { if (rec && rec.result) { state.rec = rec; render(rec); if (rec.pending && (rec.pending.speed || rec.pending.bench)) pollSpeed(rec.id, 0); } }).catch(() => {});
  }
})();
