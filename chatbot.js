// ═══════════════════════════════════════
// EASYWORKS AI — Chatbot Agent
// ═══════════════════════════════════════

(function() {
  'use strict';

  const CONFIG = {
    botName: 'Ewa',
    greeting: "Hey! 👋 I'm Ewa, the Easyworks AI assistant. I can answer questions about what we build, how it works, or help you get started. What can I help with?",
    typingDelay: 800,
    collectFields: ['name', 'business', 'phone', 'email'],
  };

  const KNOWLEDGE = {
    pricing: {
      keywords: ['price', 'pricing', 'cost', 'how much', 'afford', 'pay', 'money', 'dollar', 'budget', 'expensive', 'cheap', 'fee', 'subscription', 'monthly'],
      response: "We don't do one price for everyone, because no two businesses are weak in the same place.\n\n1. **The Scan** is free and takes about a minute. It gives you your Business Longevity Rating.\n2. **The Blueprint** is a paid written diagnosis, and the fee is credited in full to your build.\n3. **The build** is scoped to what the Blueprint finds, so you only pay for what is actually weak.\n4. **Maintain** is a monthly plan where we run it for you.\n\nWant the link to the free Scan?"
    },
    aiSuite: {
      keywords: ['ai suite', 'crm', 'receptionist', 'answer call', 'follow up', 'booking', 'inbox'],
      response: "**AI Suite** covers the front desk:\n\n• A receptionist that answers every call, qualifies and books\n• Text and email follow up in under a minute\n• Online booking with reminders\n• One CRM and mobile app for every customer\n\nWe can replace your current CRM, connect to it, or run quietly beside it. What it costs depends on your Blueprint. Want to start with the free Scan?"
    },
    contentEngine: {
      keywords: ['content', 'social', 'post', 'instagram', 'tiktok', 'reels', 'video', 'branding', 'social media'],
      response: "**Content Engine** keeps your brand in front of your market:\n\n• Posts, photos and video made in your brand voice\n• Scheduled and published for you\n• Engagement watched, with reply suggestions\n\nIt is scoped after your Blueprint so it fits what your business actually needs."
    },
    seoEngine: {
      keywords: ['seo', 'google', 'search', 'ranking', 'gbp', 'business profile', 'local search', 'maps'],
      response: "Getting found is part of every build:\n\n• Technical fixes on your site\n• Google Business Profile built out properly\n• Local listings and a steady review engine\n• Pages written for what your customers really search\n\nThe free Scan shows how findable you are right now. Want the link?"
    },
    revenueScale: {
      keywords: ['ad', 'ads', 'paid ads', 'paid', 'meta', 'facebook ads', 'google ads', 'scale', 'revenue scale', 'roi', 'roas', 'ad spend'],
      response: "**AI Revenue Scale** is managed Meta and Google ads:\n\n• Campaigns built and run end to end\n• Budget moved toward what is earning\n• Fresh creative tested on a schedule\n• Plain English reports\n\nYou pay ad spend straight to the platforms, so your books stay clean. It works best once calls and follow up are already handled."
    },
    voiceReport: {
      keywords: ['voice', 'dictation', 'transcription', 'notary', 'paralegal', 'report', 'document', 'whisper', 'transcribe'],
      response: "**Voice to Report** turns dictation into finished reports, using your own templates. It is a specialty product for report heavy professions. Ask us on a call if it fits your work."
    },
    bundles: {
      keywords: ['bundle', 'stack', 'package', 'discount', 'save', 'all', 'everything', 'combo', 'all in one'],
      response: "We don't sell fixed bundles anymore. Your Blueprint shows which parts of your business are weak, and the build covers those parts only. Most businesses start with calls, follow up and being found on Google. The free Scan is the fastest way to see where you stand."
    },
    timeline: {
      keywords: ['how long', 'how fast', 'when', 'timeline', 'start', 'setup', 'get going', 'ready', 'launch'],
      response: "About a week from your first call:\n\n1. **Days 1 to 3.** Scan and Blueprint. We diagnose what is weak.\n2. **Days 4 to 6.** We build it with you and test it.\n3. **Day 7 onward.** You go live, your team is trained, and we keep it running.\n\nNo technical skills needed on your side."
    },
    contract: {
      keywords: ['contract', 'lock in', 'cancel', 'commit', 'long term', 'agreement', 'month to month', 'quit', 'leave'],
      response: "Not happy in the first 30 days? We make it right or refund you. Terms for your build and monthly plan are laid out plainly in your Blueprint before you commit to anything."
    },
    industries: {
      keywords: ['industry', 'business type', 'contractor', 'plumber', 'hvac', 'lawyer', 'dentist', 'physio', 'physical therapy', 'nail', 'spa', 'salon', 'restaurant', 'real estate', 'auto', 'cleaning', 'fitness', 'landscap'],
      response: "We work with most businesses that live on calls, bookings and reviews: clinics, dental offices, spas, trades and contractors, real estate, law firms, auto, fitness and more.\n\nTell me what you do and I'll point you to the right page, or you can run the free Scan and see your own numbers."
    },
    onsite: {
      keywords: ['founder', 'who', 'remote', 'onsite', 'on-site', 'in person', 'install', 'location', 'usa', 'united states', 'america', 'where', 'surrey', 'canada', 'bc', 'local', 'whistler', 'vancouver', 'chilliwack', 'abbotsford', 'langley', 'global', 'partnership', 'reseller', 'agency'],
      response: "Easyworks is **founder led**. The person you talk to on the first call is the person who scopes and builds your system.\n\nWe work remote first with businesses across Canada and the United States, and your team is trained live.\n\nWe're also open to partnerships with agencies and resellers. Email team@easyworksai.com with 'Partnership inquiry'."
    },
    ai: {
      keywords: ['ai', 'artificial intelligence', 'robot', 'bot', 'automated', 'real person', 'human', 'live agent'],
      response: "The receptionist holds a natural conversation. It answers questions, qualifies the caller and books the appointment.\n\nThere is always a human layer. Urgent calls route to you, and our team watches and tunes the system every month."
    },
    results: {
      keywords: ['results', 'roi', 'return', 'work', 'proof', 'case study', 'testimonial', 'guarantee'],
      response: "We don't quote numbers we can't stand behind for your business. Here's what the system is built to do:\n\n• Answer every call, including after hours\n• Reply to new inquiries in under a minute\n• Follow up until the customer books or says no\n• Ask for a review after every job\n\nThe free Scan estimates what the gaps are costing you today, using your own details. And if you're not happy in the first 30 days, we make it right or refund you."
    },
    getStarted: {
      keywords: ['get started', 'sign up', 'begin', 'interested', 'ready', 'lets go', 'let\'s go', 'book', 'call', 'schedule', 'talk to someone', 'speak'],
      response: "Let's do it! I just need a few quick details to get you connected with our team:\n\nWhat's your **name** and **business name**?"
    },
    competitor: {
      keywords: ['competitor', 'compare', 'vs', 'versus', 'alternative', 'difference', 'better', 'other', 'already have', 'diy', 'agency'],
      response: "Three doors most businesses face:\n\n1. **Do it yourself.** Your time, plus a pile of tools that don't talk to each other.\n2. **Big agency.** Long contracts, reports instead of results, and you're one client of hundreds.\n3. **Easyworks.** Founder led. One connected system, built and run for you, with a 30 day make it right or refund promise.\n\nWant to see where your business stands? The free Scan takes about a minute."
    }
  };

  const FALLBACK_RESPONSES = [
    "Good question! Let me make sure I get you the right answer. Would you like me to connect you with our team directly, or can I help with what we build or how we work?",
    "I want to make sure I give you accurate info on that. Our team can dive deeper. Want me to have someone reach out? Or I can help with what's included or how fast we get you set up.",
    "That's a bit outside my wheelhouse, but our team would love to chat about it. Want to book a quick 15-min call, or is there something else I can help with — like what we build or how it works?"
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
      .ew-chat-widget { --ew-accent: #3b82f6; --ew-cyan: #22d3ee; --ew-magenta: #22d3ee; --ew-bg: #070b16; --ew-surface: #0c1424; --ew-surface2: #0f182c; --ew-border: rgba(59,130,246,0.18); --ew-text: #eef2fb; --ew-dim: #aab8d6; --ew-font: 'Space Grotesk', -apple-system, sans-serif; --ew-font-body: 'Inter', -apple-system, sans-serif; }
      .ew-chat-fab { position: fixed; bottom: 86px; right: 22px; z-index: 998; width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #22d3ee 100%); border: 1px solid rgba(255,255,255,0.12); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 28px rgba(59,130,246,0.55), 0 0 24px rgba(34,211,238,0.35), 0 0 0 0 rgba(59,130,246,0.4); transition: all 0.3s cubic-bezier(0.16,1,0.3,1); }
      .ew-chat-fab:hover { transform: scale(1.08); box-shadow: 0 6px 32px rgba(59,130,246,0.6); }
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
      .ew-quick-btn:hover { border-color: var(--ew-accent); color: var(--ew-accent); background: rgba(59,130,246,0.08); }

      .ew-chat-footer { padding: 14px 16px; border-top: 1px solid var(--ew-border); background: var(--ew-surface); flex-shrink: 0; }
      .ew-chat-input-wrap { display: flex; align-items: center; gap: 8px; background: var(--ew-bg); border: 1px solid var(--ew-border); border-radius: 12px; padding: 4px 4px 4px 14px; transition: border-color 0.2s; }
      .ew-chat-input-wrap:focus-within { border-color: rgba(59,130,246,0.5); }
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
        addBotMessage(`${state.leadData.business}, love it. What's the best **phone number** to reach you?`);
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
