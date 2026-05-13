// ═══════════════════════════════════════
// EASYWORKS AI — Chatbot Agent
// ═══════════════════════════════════════

(function() {
  'use strict';

  const CONFIG = {
    botName: 'Ewa',
    greeting: "Hey! 👋 I'm Ewa, the Easyworks AI assistant. I can answer questions about our services, pricing, or help you get started. What can I help with?",
    typingDelay: 800,
    collectFields: ['name', 'business', 'phone', 'email'],
  };

  const KNOWLEDGE = {
    pricing: {
      keywords: ['price', 'pricing', 'cost', 'how much', 'afford', 'pay', 'money', 'dollar', 'budget', 'expensive', 'cheap', 'fee', 'subscription', 'monthly'],
      response: "We have **5 engines** — pick what you need, stack 2+ to save up to 20%:\n\n• **AI Suite** — $997 setup + **$497/mo** (foundation — everyone starts here)\n• **Content Engine** — $1,297 setup + **$997/mo**\n• **SEO Engine** — $997 setup + **$997/mo**\n• **AI Revenue Scale** — $997 setup + **from $497/mo** (tiered by ad spend)\n• **Voice → Report** — $997 setup + **$497/mo**\n\nMost-popular bundle is **Full Stack** (AI Suite + Content + SEO + Revenue Scale) at **$3,517 setup + $2,450/mo** — 15% off standalone. Month-to-month, no lock-in. Want me to send you to the stack builder?"
    },
    aiSuite: {
      keywords: ['ai suite', 'crm', 'receptionist', 'answer call', 'follow up', 'booking', 'inbox'],
      response: "**AI Suite — $997 setup + $497/mo** — the foundation everyone starts with:\n\n• 24/7 AI receptionist (answers + qualifies + books)\n• Instant SMS + email follow-up (under 60 sec)\n• Online booking + auto-reminders\n• Full CRM + mobile app\n• Replace · Integrate · Shadow modes (your choice)\n\nThree deployment modes: replace your CRM entirely, bolt our AI onto your existing one, or run alongside in shadow. Want to book a discovery call?"
    },
    contentEngine: {
      keywords: ['content', 'social', 'post', 'instagram', 'tiktok', 'reels', 'video', 'branding', 'social media'],
      response: "**Content Engine — $1,297 setup + $997/mo**:\n\n• Daily AI-generated posts (IG, FB, TikTok)\n• Photo + video generation (Higgsfield-powered)\n• Brand voice + visual identity training\n• Auto-posting + scheduling\n• Engagement monitoring + reply suggestions\n\nYour brand presence on autopilot. Pairs with AI Revenue Scale to feed paid ads fresh creative weekly."
    },
    seoEngine: {
      keywords: ['seo', 'google', 'search', 'ranking', 'gbp', 'business profile', 'local search', 'maps'],
      response: "**SEO Engine — $997 setup + $997/mo**:\n\n• Full SEO audit + technical fixes\n• Google Business Profile claim + optimization\n• Local citations build\n• 2 monthly SEO articles\n• Review request automation\n\nGet found on Google when it matters. Inbound traffic flywheel — pairs great with AI Suite to capture every search-driven lead."
    },
    revenueScale: {
      keywords: ['ad', 'ads', 'paid ads', 'paid', 'meta', 'facebook ads', 'google ads', 'scale', 'revenue scale', 'roi', 'roas', 'ad spend'],
      response: "**AI Revenue Scale — $997 setup + from $497/mo** (tiered by ad spend):\n\n• Meta + Google ads managed end-to-end\n• Auto budget reallocation every 4 hours by ROI\n• Creative rotation + A/B testing\n• Live cross-channel attribution + plain-English reports\n• You pay ad spend directly to platforms — clean books\n\nTiers: Starter ($497/mo mgmt, up to $2k ad spend) · Growth ($997/mo, $2-5k) · Scale ($1,497/mo, $5-10k).\n\n⚠️ Warning: possibility of too many customers. Requires AI Suite + 1 demand engine. Want the calculator?"
    },
    voiceReport: {
      keywords: ['voice', 'dictation', 'transcription', 'notary', 'paralegal', 'report', 'document', 'whisper', 'transcribe'],
      response: "**Voice → Report — $997 setup + $497/mo**:\n\n• Custom client submission app\n• 24/7 automated transcription\n• Higher quality than DIY tools\n• Templates for medical, legal, real estate, insurance, court\n• Unlimited submissions, flat rate\n\nDictation in, finished report out. Built for notaries, paralegals, real estate agents, insurance adjusters, doctors, dentists, therapists, court reporters."
    },
    bundles: {
      keywords: ['bundle', 'stack', 'package', 'discount', 'save', 'all', 'everything', 'combo', 'all in one'],
      response: "Pre-built bundles save 10-20%:\n\n• **Starter** — AI Suite only — $997 + $497/mo · \"Never miss a call\"\n• **Local Growth** — AI Suite + SEO — $1,795 + $1,345/mo · \"Get found, get booked\"\n• **Brand Builder** — AI Suite + Content — $2,065 + $1,345/mo · \"Make noise, capture leads\"\n• **Full Stack** — AI Suite + Content + SEO + Revenue Scale — **$3,517 + $2,450/mo** (most popular, 15% off)\n\nStack 5 engines and save 20%. Want me to walk you through the stack builder?"
    },
    timeline: {
      keywords: ['how long', 'how fast', 'when', 'timeline', 'start', 'setup', 'get going', 'ready', 'launch'],
      response: "We move fast:\n\n1. **Discovery call** — 15 min to learn your business (on-site if you're local to Surrey, BC)\n2. **Build** — Same day, we configure everything\n3. **Go live** — 2-3 business days total\n\nZero technical skills needed. We handle 100% of setup and ongoing management. Want to book that discovery call?"
    },
    contract: {
      keywords: ['contract', 'lock in', 'cancel', 'commit', 'long term', 'agreement', 'month to month', 'quit', 'leave'],
      response: "No contracts. Month-to-month only. **30-day satisfaction guarantee** — not happy in the first 30 days, we make it right or refund you.\n\nMost clients stay because the ROI is obvious within the first week, but you're never locked in."
    },
    industries: {
      keywords: ['industry', 'business type', 'contractor', 'plumber', 'hvac', 'lawyer', 'dentist', 'physio', 'physical therapy', 'nail', 'spa', 'salon', 'restaurant', 'real estate', 'auto', 'cleaning', 'fitness', 'landscap'],
      response: "We specialize in **physio clinics, dental offices, and nail salons / spas** — but we work with 34+ industries:\n\n🦴 Physio / chiropractic\n🦷 Dental & medical\n💅 Nail salons / spas\n🔧 Contractors & trades\n🏠 Real estate\n⚖️ Law firms\n🚗 Auto services\n💪 Fitness / wellness\n🧹 Cleaning services\n📝 Notaries / paralegals\n\nEach setup is customized to your industry — different scripts, workflows, follow-up sequences. What type of business do you run?"
    },
    onsite: {
      keywords: ['onsite', 'on-site', 'in person', 'come to', 'install', 'location', 'where', 'surrey', 'canada', 'bc', 'local', 'whistler', 'vancouver', 'chilliwack', 'abbotsford', 'langley', 'global', 'partnership', 'reseller', 'agency'],
      response: "**Built in BC, serving worldwide.**\n\n🚙 **On-site install** — Whistler → Chilliwack and every city between. We come to you, install on-site, train your team. No travel charge in the corridor.\n\n🌐 **Global remote** — outside BC? We install + manage remotely with the same standard. On-call support, same response time.\n\n🤝 **Partnerships welcome** — resellers, agencies, white-label arrangements. Email team@easyworksai.com with 'Partnership inquiry'.\n\nWant to book your on-site walkthrough?"
    },
    ai: {
      keywords: ['ai', 'artificial intelligence', 'robot', 'bot', 'automated', 'real person', 'human', 'live agent'],
      response: "Our AI receptionist handles calls with natural conversation — qualifies leads, answers FAQs, books appointments. Callers typically can't tell it's AI.\n\nBut there's always a human layer: urgent calls route to you, our team manages + optimizes everything behind the scenes. It's not \"set and forget\" — it's a fully managed system.\n\nWant a sample call?"
    },
    results: {
      keywords: ['results', 'roi', 'return', 'work', 'proof', 'case study', 'testimonial', 'guarantee'],
      response: "What our clients typically see:\n\n• **3x more leads** captured (no missed calls)\n• **<60 sec** response time to new inquiries\n• **40% more bookings** from better follow-up\n• **5x more reviews** within 30 days\n• **2.4× ROAS lift** on Revenue Scale clients within 90 days\n\nOne dental clinic went from 3 Google reviews to 47 in 30 days. **30-day satisfaction guarantee** on every engine.\n\nWant to see how this would work for your specific business?"
    },
    getStarted: {
      keywords: ['get started', 'sign up', 'begin', 'interested', 'ready', 'lets go', 'let\'s go', 'book', 'call', 'schedule', 'talk to someone', 'speak'],
      response: "Let's do it! I just need a few quick details to get you connected with our team:\n\nWhat's your **name** and **business name**?"
    },
    competitor: {
      keywords: ['competitor', 'compare', 'vs', 'versus', 'alternative', 'difference', 'better', 'other', 'already have', 'diy', 'agency'],
      response: "Three doors most businesses face:\n\n1. **DIY** — \"I'll learn it myself.\" Real cost: your time + 7 disconnected tools.\n2. **Big agency** — $5-15k/mo, reports not results, 12-month contracts, you're client #847.\n3. **Easyworks** — from $497/mo, we come to you, install on-site, month-to-month, 30-day refund.\n\nIt's the difference between buying a race car and having a pit crew. Want us to walk you through what we'd replace in your current stack?"
    }
  };

  const FALLBACK_RESPONSES = [
    "Good question! Let me make sure I get you the right answer. Would you like me to connect you with our team directly, or can I help with something about our pricing, features, or how we work?",
    "I want to make sure I give you accurate info on that. Our team can dive deeper — want me to have someone reach out? Or I can help with pricing, what's included, or how fast we get you set up.",
    "That's a bit outside my wheelhouse, but our team would love to chat about it. Want to book a quick 15-min call, or is there something else I can help with — like pricing or features?"
  ];

  let state = {
    isOpen: false,
    messages: [],
    isTyping: false,
    leadData: {},
    collectingLead: false,
    collectStep: 0,
    fallbackCount: 0
  };

  function injectStyles() {
    const css = `
      .ew-chat-widget { --ew-accent: #a855f7; --ew-cyan: #22d3ee; --ew-magenta: #ff2bd1; --ew-bg: #05030d; --ew-surface: #120826; --ew-surface2: #1a1330; --ew-border: rgba(168,85,247,0.18); --ew-text: #f5f3ff; --ew-dim: #c4b5fd; --ew-font: 'Space Grotesk', -apple-system, sans-serif; --ew-font-body: 'Inter', -apple-system, sans-serif; }
      .ew-chat-fab { position: fixed; bottom: 86px; right: 22px; z-index: 998; width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #00f5ff 0%, #a855f7 50%, #ff2bd1 100%); border: 1px solid rgba(255,255,255,0.12); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 28px rgba(168,85,247,0.55), 0 0 24px rgba(255,43,209,0.35), 0 0 0 0 rgba(168,85,247,0.4); transition: all 0.3s cubic-bezier(0.16,1,0.3,1); }
      .ew-chat-fab:hover { transform: scale(1.08); box-shadow: 0 6px 32px rgba(168,85,247,0.6); }
      .ew-chat-fab.open { transform: scale(0.9) rotate(90deg); opacity: 0; pointer-events: none; }
      .ew-chat-fab svg { width: 28px; height: 28px; fill: #0a0e1a; }
      .ew-chat-fab .ew-fab-pulse { position: absolute; inset: -4px; border-radius: 50%; border: 2px solid var(--ew-accent); animation: ew-pulse 2s ease-out infinite; }
      @keyframes ew-pulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.4); opacity: 0; } }

      .ew-chat-window { position: fixed; bottom: 24px; right: 24px; z-index: 10000; width: 380px; height: 580px; max-height: calc(100vh - 48px); max-width: calc(100vw - 48px); border-radius: 18px; background: var(--ew-bg); border: 1px solid var(--ew-border); box-shadow: 0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset; display: flex; flex-direction: column; overflow: hidden; transform: scale(0.92) translateY(20px); opacity: 0; pointer-events: none; transition: all 0.35s cubic-bezier(0.16,1,0.3,1); }
      .ew-chat-window.open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }

      .ew-chat-header { padding: 16px 20px; background: var(--ew-surface); border-bottom: 1px solid var(--ew-border); display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
      .ew-chat-avatar { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--ew-accent), var(--ew-cyan)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .ew-chat-avatar svg { width: 18px; height: 18px; fill: #0a0e1a; }
      .ew-chat-header-info { flex: 1; }
      .ew-chat-header-name { font-family: var(--ew-font); font-weight: 600; font-size: 0.9rem; color: var(--ew-text); }
      .ew-chat-header-status { font-size: 0.72rem; color: var(--ew-dim); display: flex; align-items: center; gap: 6px; }
      .ew-chat-header-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #10b981; }
      .ew-chat-close { background: none; border: none; cursor: pointer; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
      .ew-chat-close:hover { background: rgba(255,255,255,0.06); }
      .ew-chat-close svg { width: 18px; height: 18px; stroke: var(--ew-dim); }

      .ew-chat-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth; }
      .ew-chat-body::-webkit-scrollbar { width: 4px; }
      .ew-chat-body::-webkit-scrollbar-track { background: transparent; }
      .ew-chat-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

      .ew-msg { max-width: 85%; padding: 12px 16px; border-radius: 14px; font-size: 0.85rem; line-height: 1.55; animation: ew-msg-in 0.3s cubic-bezier(0.16,1,0.3,1); }
      @keyframes ew-msg-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .ew-msg-bot { background: var(--ew-surface2); color: var(--ew-text); border-bottom-left-radius: 4px; align-self: flex-start; }
      .ew-msg-user { background: var(--ew-accent); color: #fff; border-bottom-right-radius: 4px; align-self: flex-end; }
      .ew-msg-bot strong { color: var(--ew-cyan); font-weight: 600; }
      .ew-msg-bot p { margin: 0 0 8px 0; }
      .ew-msg-bot p:last-child { margin: 0; }
      .ew-msg-bot ul, .ew-msg-bot ol { margin: 4px 0 8px 16px; padding: 0; }
      .ew-msg-bot li { margin: 2px 0; }

      .ew-typing { display: flex; align-items: center; gap: 4px; padding: 12px 16px; background: var(--ew-surface2); border-radius: 14px; border-bottom-left-radius: 4px; align-self: flex-start; animation: ew-msg-in 0.3s cubic-bezier(0.16,1,0.3,1); }
      .ew-typing-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ew-dim); animation: ew-bounce 1.2s infinite; }
      .ew-typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .ew-typing-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes ew-bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }

      .ew-quick-replies { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 0; animation: ew-msg-in 0.3s cubic-bezier(0.16,1,0.3,1); }
      .ew-quick-btn { background: var(--ew-surface); border: 1px solid var(--ew-border); color: var(--ew-text); font-family: var(--ew-font-body); font-size: 0.78rem; padding: 8px 14px; border-radius: 20px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
      .ew-quick-btn:hover { border-color: var(--ew-accent); color: var(--ew-accent); background: rgba(168,85,247,0.08); }

      .ew-chat-footer { padding: 14px 16px; border-top: 1px solid var(--ew-border); background: var(--ew-surface); flex-shrink: 0; }
      .ew-chat-input-wrap { display: flex; align-items: center; gap: 8px; background: var(--ew-bg); border: 1px solid var(--ew-border); border-radius: 12px; padding: 4px 4px 4px 14px; transition: border-color 0.2s; }
      .ew-chat-input-wrap:focus-within { border-color: rgba(168,85,247,0.5); }
      .ew-chat-input { flex: 1; background: none; border: none; outline: none; color: var(--ew-text); font-family: var(--ew-font-body); font-size: 0.85rem; padding: 8px 0; resize: none; }
      .ew-chat-input::placeholder { color: var(--ew-dim); }
      .ew-chat-send { width: 34px; height: 34px; border-radius: 8px; background: var(--ew-accent); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
      .ew-chat-send:hover { background: #2563eb; }
      .ew-chat-send:disabled { opacity: 0.4; cursor: default; }
      .ew-chat-send svg { width: 16px; height: 16px; fill: white; }

      .ew-powered { text-align: center; padding: 6px; font-size: 0.65rem; color: var(--ew-dim); opacity: 0.6; }

      @media (max-width: 480px) {
        .ew-chat-window { bottom: 0; right: 0; width: 100%; height: 100%; max-height: 100vh; max-width: 100vw; border-radius: 0; }
        .ew-chat-fab { bottom: 16px; right: 16px; }
      }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createWidget() {
    const fab = document.createElement('button');
    fab.className = 'ew-chat-fab';
    fab.setAttribute('aria-label', 'Open chat');
    fab.innerHTML = `
      <div class="ew-fab-pulse"></div>
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
    `;

    const win = document.createElement('div');
    win.className = 'ew-chat-window';
    win.innerHTML = `
      <div class="ew-chat-header">
        <div class="ew-chat-avatar">
          <svg viewBox="0 0 20 20"><path d="M3 14.5L10 3l7 11.5H3z" opacity="0.9"/><path d="M6.5 14.5L10 8.5l3.5 6H6.5z" opacity="0.5"/></svg>
        </div>
        <div class="ew-chat-header-info">
          <div class="ew-chat-header-name">${CONFIG.botName}</div>
          <div class="ew-chat-header-status">Online now</div>
        </div>
        <button class="ew-chat-close" aria-label="Close chat">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="ew-chat-body" id="ewChatBody"></div>
      <div class="ew-chat-footer">
        <div class="ew-chat-input-wrap">
          <input class="ew-chat-input" id="ewChatInput" type="text" placeholder="Type a message..." autocomplete="off">
          <button class="ew-chat-send" id="ewChatSend" aria-label="Send">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
        <div class="ew-powered">Powered by Easyworks AI</div>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(win);

    fab.addEventListener('click', () => toggleChat(true));
    win.querySelector('.ew-chat-close').addEventListener('click', () => toggleChat(false));

    const input = win.querySelector('#ewChatInput');
    const sendBtn = win.querySelector('#ewChatSend');

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
    sendBtn.addEventListener('click', handleSend);

    return { fab, win };
  }

  let elements;

  function toggleChat(open) {
    state.isOpen = open;
    elements.fab.classList.toggle('open', open);
    elements.win.classList.toggle('open', open);

    if (open && state.messages.length === 0) {
      setTimeout(() => {
        addBotMessage(CONFIG.greeting);
        showQuickReplies(['What do you offer?', 'Pricing', 'How fast to start?', 'Get started']);
      }, 400);
    }

    if (open) {
      setTimeout(() => elements.win.querySelector('#ewChatInput').focus(), 350);
    }
  }

  function handleSend() {
    const input = elements.win.querySelector('#ewChatInput');
    const text = input.value.trim();
    if (!text || state.isTyping) return;

    input.value = '';
    addUserMessage(text);

    if (state.collectingLead) {
      handleLeadCollection(text);
    } else {
      processMessage(text);
    }
  }

  function addUserMessage(text) {
    state.messages.push({ role: 'user', text });
    const body = elements.win.querySelector('#ewChatBody');
    const msg = document.createElement('div');
    msg.className = 'ew-msg ew-msg-user';
    msg.textContent = text;
    body.appendChild(msg);
    scrollToBottom();
  }

  function addBotMessage(text) {
    state.messages.push({ role: 'bot', text });
    const body = elements.win.querySelector('#ewChatBody');
    const msg = document.createElement('div');
    msg.className = 'ew-msg ew-msg-bot';
    msg.innerHTML = formatMarkdown(text);
    body.appendChild(msg);
    scrollToBottom();
  }

  function showTyping() {
    state.isTyping = true;
    const body = elements.win.querySelector('#ewChatBody');
    const typing = document.createElement('div');
    typing.className = 'ew-typing';
    typing.id = 'ewTyping';
    typing.innerHTML = '<div class="ew-typing-dot"></div><div class="ew-typing-dot"></div><div class="ew-typing-dot"></div>';
    body.appendChild(typing);
    scrollToBottom();
  }

  function hideTyping() {
    state.isTyping = false;
    const typing = document.getElementById('ewTyping');
    if (typing) typing.remove();
  }

  function showQuickReplies(options) {
    const body = elements.win.querySelector('#ewChatBody');
    const wrap = document.createElement('div');
    wrap.className = 'ew-quick-replies';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'ew-quick-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        wrap.remove();
        addUserMessage(opt);
        processMessage(opt);
      });
      wrap.appendChild(btn);
    });
    body.appendChild(wrap);
    scrollToBottom();
  }

  function processMessage(text) {
    const lower = text.toLowerCase();

    let bestMatch = null;
    let bestScore = 0;

    for (const [key, data] of Object.entries(KNOWLEDGE)) {
      let score = 0;
      for (const kw of data.keywords) {
        if (lower.includes(kw)) {
          score += kw.length;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = data;
      }
    }

    showTyping();

    const delay = CONFIG.typingDelay + Math.random() * 600;

    setTimeout(() => {
      hideTyping();

      if (bestMatch && bestScore > 0) {
        state.fallbackCount = 0;
        addBotMessage(bestMatch.response);

        if (bestMatch === KNOWLEDGE.getStarted) {
          state.collectingLead = true;
          state.collectStep = 0;
        } else {
          showQuickReplies(['Pricing', 'Get started', 'How fast?', 'What industries?']);
        }
      } else {
        state.fallbackCount++;
        const fallback = FALLBACK_RESPONSES[Math.min(state.fallbackCount - 1, FALLBACK_RESPONSES.length - 1)];
        addBotMessage(fallback);
        showQuickReplies(['What do you offer?', 'Pricing', 'Get started']);
      }
    }, delay);
  }

  function handleLeadCollection(text) {
    const step = state.collectStep;

    if (step === 0) {
      const parts = text.split(/(?:,|\band\b|\bat\b)/i);
      state.leadData.name = parts[0]?.trim() || text;
      if (parts[1]) state.leadData.business = parts[1].trim();

      showTyping();
      setTimeout(() => {
        hideTyping();
        if (state.leadData.business) {
          addBotMessage(`Nice to meet you, ${state.leadData.name}! ${state.leadData.business} sounds great. What's the best **phone number** to reach you?`);
          state.collectStep = 2;
        } else {
          addBotMessage(`Great, ${state.leadData.name}! What's your **business name**?`);
          state.collectStep = 1;
        }
      }, CONFIG.typingDelay);
    } else if (step === 1) {
      state.leadData.business = text;
      showTyping();
      setTimeout(() => {
        hideTyping();
        addBotMessage(`${state.leadData.business} — love it. What's the best **phone number** to reach you?`);
        state.collectStep = 2;
      }, CONFIG.typingDelay);
    } else if (step === 2) {
      state.leadData.phone = text;
      showTyping();
      setTimeout(() => {
        hideTyping();
        addBotMessage("And your **email**? (We'll send the details there too)");
        state.collectStep = 3;
      }, CONFIG.typingDelay);
    } else if (step === 3) {
      state.leadData.email = text;
      state.collectingLead = false;
      state.collectStep = 0;

      showTyping();
      setTimeout(() => {
        hideTyping();
        submitLead(state.leadData);
        addBotMessage(`Perfect! Here's what I've got:\n\n• **Name:** ${state.leadData.name}\n• **Business:** ${state.leadData.business}\n• **Phone:** ${state.leadData.phone}\n• **Email:** ${state.leadData.email}\n\nOur team will reach out within a few hours to schedule your discovery call. In the meantime, is there anything else I can help with?`);
        showQuickReplies(['What happens next?', 'Tell me more about features', 'Thanks!']);
      }, CONFIG.typingDelay + 400);
    }
  }

  function submitLead(data) {
    const formData = new URLSearchParams();
    formData.append('form-name', 'intake');
    formData.append('name', data.name || '');
    formData.append('business', data.business || '');
    formData.append('phone', data.phone || '');
    formData.append('email', data.email || '');
    formData.append('message', '[Lead captured via chatbot]');
    formData.append('industry', 'Other');

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    }).catch(() => {});
  }

  function formatMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n• /g, '</p><ul><li>')
      .replace(/\n(?=•)/g, '')
      .replace(/• /g, '<li>')
      .replace(/<li>(.*?)(?=<li>|<\/p>|$)/g, '<li>$1</li>')
      .replace(/<\/li>(?=<\/p>)/g, '</li></ul>')
      .replace(/\n(\d+)\. /g, '</p><ol><li>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/📞|⚡|⭐|📅|📱|📊|🔧|🏠|⚖️|🦷|💇|🚗|🍽️|💪|🧹|👋/g, (m) => `<span style="margin-right:4px">${m}</span>`);
  }

  function scrollToBottom() {
    const body = elements.win.querySelector('#ewChatBody');
    requestAnimationFrame(() => {
      body.scrollTop = body.scrollHeight;
    });
  }

  function init() {
    injectStyles();
    elements = createWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
