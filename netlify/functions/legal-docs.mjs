// The compliance documents every sales team member signs before they can operate.
//
// DRAFT STATUS: these are plain-English templates written in-house. They are marked
// DRAFT and the compliance gate ships OFF (see compliance-config.json / team-compliance).
// Brad: review each doc, have counsel bless it, remove the DRAFT_NOTE line, bump the
// `version` if you change wording (a version bump re-requires signature), then flip the
// gate ON from the portal admin controls. Nothing forces a rep to sign until you do.
//
// Decisions baked in (per Brad 2026-08-26):
//  - "Non-compete" is a Non-Solicitation + Non-Circumvention agreement (enforceable where
//    a true non-compete is void, e.g. California). A general non-compete was intentionally
//    NOT used.
//  - Signing is built-in click-to-sign: typed legal name + acknowledgements + timestamp +
//    IP + document version, captured by team-compliance.mjs.
//
// The contracting entity is AMPCOS (1597897 B.C. LTD.), which operates the Easyworks
// sales program. Governing law: British Columbia, Canada.

export const COMPANY = 'AMPCOS Advisory Group (1597897 B.C. LTD.)';
export const PROGRAM = 'the Easyworks Sales Associate Program';

const DRAFT_NOTE =
  '<p class="draftnote">DRAFT — in-house template, pending final legal review. ' +
  'Not the final signing version until approved.</p>';

// Each doc: key, title, version (bump to re-require signing), order, acks (checkboxes the
// signer must tick), body (HTML). Keep bodies self-contained and plain-English.
export const DOCS = [
  {
    key: 'nda',
    title: 'Confidentiality & Non-Disclosure Agreement',
    version: '2026-08-26.1',
    order: 1,
    acks: [
      'I understand what counts as Confidential Information under this agreement.',
      'I will use it only to do my job for the Company and will not share or copy it elsewhere.',
      'These confidentiality obligations continue after I stop working with the Company.',
    ],
    body: `${DRAFT_NOTE}
      <p>This Confidentiality &amp; Non-Disclosure Agreement is between <b>${COMPANY}</b> (the <b>"Company"</b>) and the person signing below (the <b>"Associate"</b>), effective on the date of signature.</p>
      <h4>1. Confidential Information</h4>
      <p>"Confidential Information" means non-public information the Associate learns through ${PROGRAM}, including: client and prospect lists and contact details, lead data and the lead pool, pricing, scripts, playbooks and training, the audit methodology and reports, CRM data, business processes, the internal platform and access codes, financials, and anything a reasonable person would understand to be confidential.</p>
      <h4>2. Obligations</h4>
      <p>The Associate will: (a) keep Confidential Information strictly confidential; (b) use it only to perform their role for the Company; (c) not copy, export, screenshot, or remove it except as needed for the role; (d) not disclose it to anyone outside the Company without written permission; and (e) protect it with at least reasonable care.</p>
      <h4>3. Exclusions</h4>
      <p>These obligations do not apply to information that is or becomes public through no fault of the Associate, that the Associate already lawfully knew, or that must be disclosed by law (with prompt notice to the Company where allowed).</p>
      <h4>4. Ownership</h4>
      <p>All Confidential Information remains the exclusive property of the Company. Nothing here grants the Associate any license or rights in it beyond the limited use above.</p>
      <h4>5. Return</h4>
      <p>On the end of the engagement, or on request, the Associate will promptly return or delete all Confidential Information (including any local copies) and confirm they have done so.</p>
      <h4>6. Term</h4>
      <p>This agreement applies during the engagement and the confidentiality obligations continue for <b>two (2) years</b> after it ends. Trade secrets remain protected for as long as they qualify as trade secrets under law.</p>
      <h4>7. General</h4>
      <p>This agreement is governed by the laws of British Columbia, Canada. If any part is unenforceable, the rest stays in effect. A breach may cause harm that money alone cannot fix, so the Company may seek an injunction in addition to other remedies.</p>`,
  },
  {
    key: 'nonsolicit',
    title: 'Non-Solicitation & Non-Circumvention Agreement',
    version: '2026-08-26.1',
    order: 2,
    acks: [
      'For 12 months after I leave, I will not solicit or divert the Company’s clients, prospects, or leads that I learned of through the Company.',
      'I will not recruit or poach the Company’s reps, staff, or contractors.',
      'I will not go around the Company to work directly with a client or lead introduced to me through the program.',
    ],
    body: `${DRAFT_NOTE}
      <p>This Non-Solicitation &amp; Non-Circumvention Agreement is between <b>${COMPANY}</b> (the <b>"Company"</b>) and the <b>"Associate"</b> signing below. It protects the Company’s clients, leads, and team. It is <b>not</b> a general non-compete: the Associate is free to work in sales, including for other companies, as long as they honor the limits below.</p>
      <h4>1. Non-Solicitation of Clients</h4>
      <p>During the engagement and for <b>twelve (12) months</b> after it ends, the Associate will not, directly or indirectly, solicit, divert, or take business away from any client, prospect, or lead of the Company that the Associate contacted, learned of, or worked on through ${PROGRAM}.</p>
      <h4>2. Non-Solicitation of People</h4>
      <p>During the same period, the Associate will not recruit, hire, or encourage to leave any rep, employee, or contractor of the Company.</p>
      <h4>3. Non-Circumvention</h4>
      <p>The Associate will not bypass the Company to provide, directly or through another business, the same or similar services to a Company client or lead that was introduced or made available to the Associate through the program. Deals count only through the Company’s official payment channels; taking a Company lead "off-book" is a breach.</p>
      <h4>4. What this does not restrict</h4>
      <p>The Associate may work in the same industry, sell for other companies, and serve their own pre-existing relationships that did not come from the Company. This agreement only protects the Company’s own clients, leads, and team.</p>
      <h4>5. Term &amp; General</h4>
      <p>The restricted period is twelve (12) months after the engagement ends. This agreement is governed by the laws of British Columbia, Canada. If any restriction is found broader than the law allows, it will be enforced to the maximum extent permitted and the rest stays in effect. The Company may seek an injunction for a breach in addition to other remedies.</p>`,
  },
  {
    key: 'contractor',
    title: 'Independent Contractor & Sales Associate Agreement',
    version: '2026-08-26.1',
    order: 3,
    acks: [
      'I am an independent contractor, responsible for my own taxes, and I am not an employee of the Company.',
      'I will follow the program rules and the law: official payment link only, approved channels only, never ask a client for their passwords, and never promise guaranteed results or rankings.',
      'The Company owns the clients, leads, and work product; my pay is on collected revenue per my separate commission terms and is subject to clawback on refunds or chargebacks.',
      'I have read and agree to the Confidentiality and Non-Solicitation agreements, which are part of this contract.',
    ],
    body: `${DRAFT_NOTE}
      <p>This Independent Contractor &amp; Sales Associate Agreement is between <b>${COMPANY}</b> (the <b>"Company"</b>) and the <b>"Associate"</b> signing below, effective on signature. It is the master agreement for the Associate’s participation in ${PROGRAM}.</p>
      <h4>1. Relationship</h4>
      <p>The Associate is an <b>independent contractor</b>, not an employee, partner, or agent. The Associate controls their own hours and methods, uses their own equipment, is responsible for their own taxes and any required registrations, and has no authority to bind the Company or make commitments on its behalf beyond selling the program with approved materials.</p>
      <h4>2. Role &amp; Scope</h4>
      <p>The Associate will promote and sell ${PROGRAM} using only official Company materials, prices, and the official payment link. All customer-facing contact must use approved Company channels. The Associate will not create side offers, alter pricing beyond authorized discounts, or represent the Company outside the approved scope.</p>
      <h4>3. Conduct &amp; Legal Compliance</h4>
      <p>The Associate will act honestly and professionally and will comply with all applicable laws for outreach and sales, including telemarketing, calling, texting, email, and do-not-call/anti-spam rules (for example TCPA and CASL, as applicable). The Associate will not: send spam, misrepresent the Company or its services, promise guaranteed rankings, dates, or outcomes, request a client’s passwords, or accept payment outside the official link.</p>
      <h4>4. Compensation</h4>
      <p>The Associate is paid commission on <b>collected</b> revenue from deals they close, at the rates and terms in their separate individual commission schedule. Commission is paid on the Company’s normal payout schedule and is <b>subject to clawback</b> if a client refunds, charges back, or cancels within the clawback window. Rates are not stated in this document; they live in the Associate’s individual terms.</p>
      <h4>5. Ownership of Work</h4>
      <p>All clients, prospects, leads, accounts, content, and work product created or handled in the role belong to the Company. The Associate assigns to the Company any intellectual property they create for the role and will help document that assignment if asked.</p>
      <h4>6. Confidentiality &amp; Non-Solicitation</h4>
      <p>The Confidentiality &amp; Non-Disclosure Agreement and the Non-Solicitation &amp; Non-Circumvention Agreement are incorporated into and part of this contract.</p>
      <h4>7. Term &amp; Termination</h4>
      <p>Either party may end this agreement at any time, with or without cause, on written notice. On termination the Associate will stop using Company materials and channels, return or delete Confidential Information, and stop representing the Company. Sections on confidentiality, non-solicitation, ownership, and clawback survive termination.</p>
      <h4>8. Representations</h4>
      <p>The Associate confirms they are legally able to work as an independent contractor, that the information they provide to the Company is accurate, and that entering this agreement does not breach any other agreement they have.</p>
      <h4>9. General</h4>
      <p>This agreement, with the two agreements it incorporates and the Associate’s commission schedule, is the entire agreement on this subject. It is governed by the laws of British Columbia, Canada, with venue in British Columbia. If any part is unenforceable, the rest stays in effect. Changes must be in writing.</p>`,
  },
];

export const docByKey = (key) => DOCS.find((d) => d.key === key) || null;
export const currentVersions = () => Object.fromEntries(DOCS.map((d) => [d.key, d.version]));

// Roles that never have to sign (the owner). Everyone else on the sales team does.
export const EXEMPT_ROLES = ['admin'];
