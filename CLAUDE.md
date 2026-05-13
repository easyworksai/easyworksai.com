# easyworks.ai — Project Instructions

This is the marketing site for **Easyworks AI Solutions** (Brad Palmer's primary business, Surrey BC).
Current state: **Redesign v2 (Cosmic Electric)** is live on the `redesign-v2` Netlify alias, awaiting Brad's approval to promote to production.

## Quick context
- **Brand:** Easyworks AI · "Less doing. More done." · Canadian-owned, Surrey BC
- **Tagline philosophy:** Sell results, never lead with "AI". Tone is EASY — tight, confident, minimal noise.
- **Mascot:** "Easy" — lean athletic faceless superhero (chrome helmet, cyan visor band, deep purple suit with magenta + cyan tron circuits, holographic neon cape). Spider-Verse meets Tron.
- **No real human faces anywhere** — only the mascot or vector illustrations.
- **Color palette:** Electric purple (#a855f7) · cyan (#22d3ee) · magenta (#ff2bd1) on deep space black (#05030d).

## Deploy commands

```bash
# Preview deploy (redesign-v2 alias)
netlify deploy --dir=. --alias=redesign-v2 --message="..."

# Promote to PRODUCTION (easyworks.ai)
netlify deploy --prod
```

The Netlify site is NOT wired to GitHub auto-deploy — every deploy is manual via CLI.
Logged in as `team@easyworksai.com`, site ID `3ba07fa5-82d5-4f17-8f6f-cdc9a91d4191`.

## File layout

```
~/Projects/easyworksai.com/
├── index.html              # Home page (redesign v2)
├── 404.html                # Cosmic 404 with lost-in-space Easy
├── thanks/index.html       # Post-Stripe success page
├── ai-suite/               # Sub-page (Foundation tier)
├── content-engine/         # Sub-page (Demand tier)
├── seo-engine/             # Sub-page (Demand tier)
├── ai-revenue-scale/       # Sub-page (Scale tier — newest, has calculator)
├── voice-report/           # Sub-page (Specialty tier)
├── img/
│   ├── easy-hero.png       # Main mascot (point + thumbs-up)
│   ├── easy-content.png    # Phone + flying social posts
│   ├── easy-seo.png        # Standing on globe pointing at #1
│   ├── easy-ai-suite.png   # Headset + holographic call interface
│   ├── easy-scale.png      # Money explosion + revenue dashboard (DOPAMINE primary)
│   ├── easy-scale-crowd.png   # Customer flow (atmospheric accent)
│   ├── easy-scale-speed.png   # Sprinting (calculator bg)
│   ├── easy-voice.png      # Mic + holographic doc stream
│   ├── easy-onsite.png     # Toolbox + blueprints
│   ├── easy-404.png        # Lost in space with ??? marks
│   ├── easy-thanks.png     # Triumphant jump + WELCOME confetti
│   └── icon.png, og-image.png, etc.
├── redesign.css            # ~3,700 lines, cosmic theme + all new components
├── redesign.js             # Cosmic canvas + parallax + stack builder + sticky CTA + conveyor prefill + loader + persistence
├── three-scene.js          # WebGL floating geometry scene (5 crystals + 110 particles + scroll dolly)
├── revenue-scale.js        # Budget calculator + animated impact counters
├── style.min.css           # Legacy v1 styles (still loaded for fallback)
├── script.min.js           # Legacy JS (nav, scroll progress, video modal)
├── chatbot.js              # Ewa chatbot widget (cosmic-themed)
├── netlify/functions/
│   ├── checkout.js         # Stripe checkout — handles all 5 engines + tier discounts
│   ├── stripe-webhook.js   # Stripe webhook receiver
│   └── submission-created.js # Netlify Forms submission handler
└── _redirects              # www → apex redirects (404.html served automatically)
```

## Pricing (encoded in checkout.js + product cards)

| Engine | Setup | Monthly | Notes |
|--------|-------|---------|-------|
| AI Suite | $997 | $497 | Foundation — everyone starts here |
| Content Engine | $1,297 | $997 | Demand engine |
| SEO Engine | $997 | $997 | Demand engine |
| AI Revenue Scale | $997 | $497 / $997 / $1,497 | Scale (tiered by client ad spend) |
| Voice → Report | $997 | $497 | Specialty / verticals |

**Stack discounts:** 2 engines = 10% · 3 = 15% · 4 = 18% · 5 = 20%
**Full Stack bundle (AI Suite + Content + SEO + Revenue Scale):** $3,517 + $2,450/mo

## Mascot pose prompt template (for re-generation)

```
3D mascot character 'Easy' — lean athletic faceless superhero in form-fitting
deep purple suit with electric magenta panels and glowing cyan tron circuit
lines, sleek chrome helmet with single horizontal glowing cyan visor band
(NO face/eyes/mouth), holographic translucent neon cape. Pose: [SPECIFIC
ACTION]. Cosmic space background, electric purple nebula, glowing cyan
grid horizon. Pixar polish, Spider-Verse meets Tron. Square composition,
full body centered, no text.
```

Use Higgsfield CLI: `higgsfield generate create nano_banana_2 --prompt "..." --wait --wait-timeout 4m`
**Avoid `flux_2` and `seedream_v4_5`** — NSFW filter triggers on "form-fitting suit" language.

After generation:
```bash
# Optimize to 1100px wide (matches retina 2× of 540px display)
sips --resampleWidth 1100 source.png --out ~/Projects/easyworksai.com/img/easy-<name>.png
```

## CSS architecture

`style.min.css` (legacy v1) loads first as a baseline. `redesign.css` overrides + adds the cosmic theme. To make changes:

- **Cosmic theme variables:** top of `redesign.css` (`:root { --electric-cyan, --electric-magenta, etc }`)
- **Hero:** `.hero-v2`, `.mascot-img`, `.mascot-glow`, `.three-scene`
- **5 engines stack:** `.engines-stack`, `.engine-hero`, `.engine-card`
- **Stack builder:** `.stack-builder-v2`, `.sb-bundles`, `.sb-engines`, `.sb-ribbon`
- **Industries spotlight + conveyor:** `.industries-spotlight`, `.conveyor-stage`, `.conv-lane`
- **Comparison band:** `.compare-grid`, `.compare-us`
- **Testimonials:** `.proof-grid`, `.proof-card`
- **Sub-page restyle shim:** `.psub-hero`, `.rs-features`, `.rs-feat`
- **Engine flow diagram:** `.engine-flow-v2`, `.ef-node`, `.ef-connector`, `.ef-pulse`

## Mascot blending technique (important)

Each mascot image has a baked-in cosmic background. To blend it into the page bg without hard square edges:

```css
.mascot-img {
  mix-blend-mode: screen;                /* dark pixels dissolve into bg */
  -webkit-mask-image: radial-gradient(ellipse 75% 85% at center 50%, #000 0%, rgba(0,0,0,0.85) 70%, transparent 100%);
  mask-image: radial-gradient(...);
  filter:
    contrast(1.22) brightness(1.05) saturate(1.18)  /* drives dark bg toward true black */
    drop-shadow(0 0 60px rgba(168,85,247,0.4))
    drop-shadow(0 0 140px rgba(255,43,209,0.25));
}
```

Combined with a `.mascot-glow` element behind (multi-layer radial gradient on screen blend mode), the mascot appears to emerge organically from the cosmic field.

## Overflow rules for floating badges

Cards with absolutely-positioned badges that extend outside (e.g., `.ind-card` with `.ind-badge` at `top: -14px`, `.compare-us` with `.cmp-best`, `.sb-bundle-best` with the 3D ribbon) need:

```css
overflow-x: clip;     /* horizontal still clips inner gradients */
overflow-y: visible;  /* lets badge stick up + hover glow extend */
```

This same fix applies to the conveyor lanes (`.conv-lane`) so hover glow doesn't get cropped.

## Key brand decisions live in memory

- Full architecture, pricing, polish log: `~/.claude/projects/-Users-bradpalmer/memory/project_easyworks_site_redesign.md`
- Financial model + JV: `~/.claude/projects/-Users-bradpalmer/memory/project_financial_model.md`
- All Easyworks-related memory: search MEMORY.md for "Easyworks"

## Quick smoke test

```bash
# All pages should return 200
for path in / /ai-suite/ /content-engine/ /seo-engine/ /voice-report/ /ai-revenue-scale/ /thanks/ /404.html; do
  /usr/bin/curl -s -o /dev/null -w "%{http_code} $path\n" "https://redesign-v2--easyworksai.netlify.app$path"
done
```

## Things to double-check BEFORE promoting to prod

1. Visual QA at mobile width (375px, 768px)
2. Stripe checkout end-to-end with `revenue-scale` engine selected
3. Form submission lands in Netlify Forms inbox
4. All page anchors in nav scroll smoothly
5. No console errors on home + each sub-page
6. Lighthouse score — at least 80 on perf, ideally 90+

## When in doubt

- **Brand tone:** EASY. Tight typography, confident copy, less noise. If a section has 3+ paragraphs, can probably cut one.
- **Mascot use:** Use existing pose if it fits. Only generate new poses when truly needed (each gen costs Higgsfield credits).
- **Image weight:** All mascots resized to 1100px wide and live in `img/` — DO NOT add 2048px originals.
- **No human faces** — the mascot is faceless (chrome visor band) intentionally.
