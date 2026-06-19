// Industry landers at /industries/<slug>/. Three priority verticals
// per project memory: dentist, physio, spa.

module.exports = [
  {
    slug: 'ai-for-dentists-bc',
    industry: 'Dental Clinics',
    region: 'BC',
    keywords: ['AI for dentists BC', 'dental office AI receptionist', 'dental practice automation Canada'],
    title: 'AI for Dental Clinics in BC',
    tagline: 'Book more cleanings. Reduce no-shows. Never miss an after-hours call.',
    intro: `Dental clinics in British Columbia lose more revenue to no-shows and missed phone calls than to any other category of operations problem. Patients call after hours. Patients call during a procedure when the front desk is helping someone else. Patients book online but no one follows up to confirm. Every one of those calls is a $300+ appointment slot. We close those gaps.`,
    services: [
      { name: 'AI Receptionist (24/7 call handling)', desc: 'Patients call after hours, the AI handles routine questions, books appointments directly into your operatory schedule, and texts a polite "we got your message" for anything that needs a human. Caps about 40% of after-hours calls without involving your staff.' },
      { name: 'No-show reduction', desc: 'Automated SMS confirmation sequence at 7 days, 24 hours, and 2 hours before the appointment. Patients can confirm or reschedule with one tap. Real BC dental clients see no-shows drop by 30-50%.' },
      { name: 'Recall automation', desc: 'Every cleaning recall hits the patient on time, every time, in their preferred channel. Patients who haven\'t booked in 9 months get a re-engagement sequence that brings 8-15% back in the door.' },
      { name: 'New-patient acquisition', desc: 'Local SEO plus a Google Business Profile fully optimized for dental categories puts you in the Map Pack for "dentist near me" in your specific BC city. Most BC clinics have terrible GBPs that we can fix in week one.' },
      { name: 'Insurance + treatment plan follow-up', desc: 'When a patient leaves with a recommended crown or implant plan, the system follows up at 7, 14, and 30 days with personalized reminders. Quietly significant for case-acceptance rates.' },
    ],
    why: [
      `We work with BC clinics specifically — PIPEDA compliance, Canadian data residency for patient information, and integration with the practice management software you already use (Tracker, ClearDent, Open Dental, Dentrix). We don't ask you to switch systems.`,
      `Most "AI for dentists" sold in BC is built for US clinics and quietly fails on Canadian compliance. We don't.`,
      `Starter ($599/mo) covers the foundation. Most clinics add the full AI Suite ($497/mo on top) once they see the call volume the receptionist handles.`,
    ],
    faq: [
      { q: 'Will the AI receptionist mishandle a medical emergency call?', a: 'No — the AI is trained to recognize emergency language and immediately escalate to your on-call protocol (text the dentist, route to your answering service, whatever you choose). It never tries to diagnose or delay.' },
      { q: 'Does it work with our practice management software?', a: 'Yes. Tracker, ClearDent, Open Dental, Dentrix, and a few others integrate directly. For everything else we set up a structured handoff so appointments still land where they need to.' },
      { q: 'Is patient data stored in the US?', a: 'No. All patient-facing data sits on Canadian-hosted infrastructure for PIPEDA compliance. We make the data residency map available on request.' },
    ],
  },
  {
    slug: 'ai-for-physio-bc',
    industry: 'Physiotherapy Clinics',
    region: 'BC',
    keywords: ['AI for physio BC', 'physiotherapy AI receptionist', 'physio clinic automation Canada'],
    title: 'AI for Physiotherapy Clinics in BC',
    tagline: 'Capture every ICBC and WSBC referral. Cut admin in half. Free your front desk.',
    intro: `BC physiotherapy clinics drown in admin. ICBC and WSBC paperwork eat hours every week. New referrals trickle in by phone, email, fax, EMR, and walk-in — and every channel needs a different response. The clinics that thrive are the ones that automate the boring parts so physios can spend their time actually treating people. That's what we install.`,
    services: [
      { name: 'AI Receptionist with ICBC/WSBC intake', desc: 'AI handles incoming calls, captures the right intake information up front (claim number, GP referral status, MVA date), and books appointments. Reduces front-desk load by an average of 15-20 hours a week in a 3-physio clinic.' },
      { name: 'Voice → Report (CL-19 + Form 8)', desc: 'Our flagship for BC physio: dictate a session, get back a fully formatted ICBC CL-19 or WSBC Form 8 with the codes and language ICBC actually accepts. Physiotherapists report saving 4-7 hours per week in reporting alone.' },
      { name: 'Automated reminders + cancellations', desc: 'Same-day cancellations cost a clinic $80-150 a slot. SMS reminder sequences cut cancellation rates by 25-40% in real BC clinics we\'ve installed.' },
      { name: 'New-patient acquisition via local SEO', desc: 'Google Business Profile optimization for the physio categories, ICBC injury-specific local pages, and content that ranks for "physio near me" in your specific city. Most BC physio clinic GBPs are 40-60% complete; we get to 100%.' },
      { name: 'Insurance billing follow-up', desc: 'When a claim is short-paid or denied, the system flags it and queues the appeal. Sounds boring, recovers thousands a month.' },
    ],
    why: [
      `Every physio tool in BC has to handle ICBC and WSBC properly or it\'s useless. We built the BC-specific layer ourselves — see our Easyworks Scribe product, also live for BC clinicians.`,
      `Most physio software was built for the US market and treats Canadian insurance as an afterthought. We didn\'t.`,
      `Starter ($599/mo) covers the foundation. Most clinics pair it with Voice → Report ($497/mo) to unlock the reporting time savings — that combo is the most common physio install we do.`,
    ],
    faq: [
      { q: 'Will it integrate with Jane?', a: 'Yes. Jane is the dominant EMR in BC physio and we integrate with it natively — appointments flow both ways, charts stay clean.' },
      { q: 'Is the AI compliant for ICBC and WSBC documentation?', a: 'Yes — Voice → Report outputs accept the codes and language ICBC and WSBC require. Every output is reviewed and editable by the physiotherapist before submission; the AI assists, the clinician signs off.' },
      { q: 'Will my older patients be confused by AI calls?', a: 'The AI is configured to sound like a polite human receptionist. We let you adjust the tone, name, and voice. If a patient says they\'d rather talk to a person, the call routes immediately.' },
    ],
  },
  {
    slug: 'ai-for-spas-bc',
    industry: 'Spas + Med-Spas',
    region: 'BC',
    keywords: ['AI for spas BC', 'spa AI receptionist', 'med-spa automation Canada'],
    title: 'AI for Spas and Med-Spas in BC',
    tagline: 'Book at 11pm when your client decides. Upsell during the call. Build a 5-star Google profile.',
    intro: `Spa clients book emotionally and impulsively. They decide at 10pm Wednesday that they want a facial Saturday, and if they can\'t book it in the next 90 seconds, half of them won\'t book at all. Most BC spas don\'t pick up after 7pm. Most don\'t have online booking that actually works on mobile. Most don\'t follow up on a treatment plan. We fix all three.`,
    services: [
      { name: 'AI Receptionist (24/7 booking)', desc: 'Client calls at any hour, the AI books the right service into the right room with the right esthetician. Handles the basics ("how long does it take," "what should I wear," "is parking free") without burning your front desk\'s time during the day.' },
      { name: 'Treatment-plan follow-up', desc: 'A client who comes in for a facial often needs the next one in 4-6 weeks. The system queues the reminder, suggests rebooking, and offers a small loyalty incentive at the right moment. Significant rebooking lift in real spas we run this for.' },
      { name: 'Review velocity engine', desc: 'Every happy client gets a polite Google review request 24 hours after their visit. Spas with proper review automation hit 4.9 stars and dominate the Map Pack — clients with 4.2 stars get skipped over.' },
      { name: 'New-client acquisition via local SEO', desc: 'Google Business Profile optimization with proper categories ("med spa" vs "day spa" vs "skincare clinic" matters more than people think), city-specific content for your service area, and review velocity working together.' },
      { name: 'Upsell during booking', desc: 'When a client books a facial, the AI offers an add-on (LED therapy, lip treatment) at the right price point. Conversion is meaningful when it sounds like a friendly upgrade instead of a sales pitch.' },
    ],
    why: [
      `Spa marketing is brand-led. Most AI tools sound corporate and kill the vibe. Ours is configured for your specific brand voice — we calibrate it during install so it sounds like your front desk would, not a robot.`,
      `BC-specific compliance for med-spas matters. Botox, fillers, and laser treatments have provincial regulations on advertising and intake; we configure the AI to stay on the right side.`,
      `Starter ($599/mo) covers it. Higher-volume spas usually add Content Engine ($997/mo) for the Instagram and TikTok content that drives the front-of-funnel.`,
    ],
    faq: [
      { q: 'Will it integrate with Mindbody / Vagaro / Boulevard?', a: 'Yes — those three are the most common spa booking systems in BC and we integrate with all of them.' },
      { q: 'How does it handle med-spa regulated services (Botox, filler)?', a: 'It does NOT book regulated services directly. For consultations and follow-ups, yes. For first-time injectables, it always routes to a human consultation. We configure this based on your province and provincial regulator guidance.' },
      { q: 'Can it sound like our brand?', a: 'Yes. We give you a brand-voice form during install — tone, vibe, even the AI\'s name if you want one. The receptionist sounds consistent with your space.' },
    ],
  },
];
