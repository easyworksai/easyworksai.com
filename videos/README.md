# Demo videos pipeline

**Source of truth:** `~/easyworks/media/remotion/` (Remotion + React + ffmpeg).

## Rebuild commands
```
cd ~/easyworks/media/remotion
npm run build:overview     # → easyworks-overview.mp4 (homepage hero)
npm run build:social       # → demo-social-engine.mp4 (= content-engine demo)
npm run build:seo          # → demo-seo-engine.mp4
npm run build:ai           # → demo-ai-suite.mp4
npm run build:voice        # → demo-voice-report.mp4
```

Each command renders via Remotion, copies the file into both this folder and `~/Desktop/Easyworks AI Solutions/Demos/`.

**Do not** edit videos with PIL/ffmpeg-only scripts. Premium fidelity requires Remotion (see `~/.claude/projects/-Users-bradpalmer/memory/reference_premium_demo_pipeline.md`).
