# PRODUCT.md — Project Athena (web)

## What it is
An **Enterprise Organizational Digital Twin**. Not a dashboard — a *living systems observatory*. The user creates a company, presses **Start Simulation**, and watches an organization evolve day by day through thousands of interacting decisions. The research question the whole product serves: **how do organizations evolve as interconnected decisions accumulate over time?**

## Register
**Product UI with a committed identity.** The user is in a task (creating, observing, steering a simulated org), so product discipline rules: consistent component vocabulary, full interaction-state coverage, motion that conveys state. But the *feel* is a game/instrument — closer to **SimCity, Factorio, Football Manager** than Power BI or Tableau. Density and precision are features. The tool disappears into the act of watching a world breathe.

## Who / where / mood (the scene)
A solo operator, alone at night, leaning into a dark screen, watching a company they willed into existence live or die on its own. Focused, a little obsessive, game-night energy. This scene forces a **dark** theme — this is an instrument in a dark room, not a document under office light.

## Design law — "SIGNAL OVER NOISE" (committed brand — do not drift)
Monotone cyberpunk HUD. Ruthless efficiency, brutalist and grid-locked — a heads-up
display, not a marketing page. Tokens live in `app/globals.css`. (This supersedes the
earlier Tokyo-Night-green skin, now retired.)

- **The Void** — background `#050505` (`--color-void`); panels `#0a0a0a`; structural
  hairlines `#1a1a1a` (`--color-grid`); a faint 48px HUD grid, masked.
- **Ash & Chrome** — text `#e0e0e0` (`--color-ash`), secondary `#9a9a9a`, metadata `#6e6e6e`.
- **The Phosphor** — Electric Crimson `#ff003c` (`--color-phosphor`) is the ONLY accent.
  Used *strictly* for interactive states (hover, active control) and **critical data
  points** (a metric in its danger band, negative deltas, insolvency, the LIVE pulse).
  Colour always means "look here." Monotone everywhere else — no second hue, ever.
- **Type**: display = `Space Grotesk` (`--font-display`), ALL CAPS, tight tracking,
  `.stretch` (scaleX 1.08) on the largest heads for the extended/brutalist feel —
  swappable to Druk Wide / Monument Extended via one `@font-face`. Body/data/labels =
  `JetBrains Mono` (`--font-mono`) — the whole UI reads as raw terminal output.
- **Emphasis** monotone; `em` carries a phosphor underline only. Body contrast ≥4.5:1.

## Motion & effects
Cinematic and kinetic, but state-first. All have `prefers-reduced-motion` fallbacks.
- **Decode text** (`DecodeText`) — headers scramble through glyphs and resolve; on mount or on-view.
- **WebGL topology** (`TopologyField`, three.js) — ambient cursor-reactive point cloud; crimson only at the crests. Pauses when hidden; off under reduced-motion.
- **Grain + scanlines** — fixed, imperceptible CRT texture (`.grain`, `.scanlines`).
- **Glitch** (`.glitch`) — 0.22s chromatic-aberration flicker on hover before snapping to phosphor.
- **Lenis** smooth heavy-inertia scroll (`SmoothScroll`); native under reduced-motion.
- **Tick heartbeat** — figures roll to new values (Framer Motion), events slide into the feed.
- HUD corner brackets (`.bracket`) on key panels. Focus one wow per view; excess is noise.

## Non-negotiables
- No AI dependency in any core view — the world runs on the deterministic engine alone.
- Mono for data/labels, never a display font in a UI label.
- Respect the absolute bans: no side-stripe borders, no gradient text, no glassmorphism-by-default, no hero-metric-template clichés, no identical card grids.
