# System Topology

The whole of Athena on one screen. Read top to bottom: the browser holds the
frontend *and* (in V1) the engine; the three-layer law lives inside the engine.

```
PROJECT ATHENA — ORGANIZATIONAL DIGITAL TWIN // TOPOLOGY v1 (TypeScript engine)
The Living Systems Initiative · deterministic-first · AI-optional

┌─────────────────────────────────────────────────────────────────────────────┐
│  BROWSER  ·  TypeScript / Next.js 15 / React 19          [ deploy → Vercel ]  │
│                                                                               │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐  │
│   │  CREATE CO.    │  │  OBSERVATORY  │  │  ORG TOPOLOGY  │  │  WORLD FEED  │  │
│   │  (Phase 1)     │  │  vitals·time  │  │  React Flow    │  │  events      │  │
│   └───────────────┘  │  Framer·D3     │  │  (Phase 1)     │  └──────────────┘  │
│                      └───────────────┘  └───────────────┘                     │
│   ┌────────────────────────────────────────────────────────────────────────┐ │
│   │  EngineClient  (web/lib/engine-client.ts)  — the ONE boundary            │ │
│   │  V1: LocalEngineClient ── in-process ──►┐                                │ │
│   │  V2: RemoteEngineClient ── fetch/SSE ───┼──► (future FastAPI)            │ │
│   └─────────────────────────────────────────┼──────────────────────────────┘ │
│                                             ▼                                  │
│  ╔═══════════════════════ @athena/engine (pure TS) ══════════════════════╗   │
│  ║  LEVEL 1 — DETERMINISTIC SIMULATION  (mandatory · the true intelligence)║  │
│  ║    createOrganization(config) → OrgState                                ║  │
│  ║    advance(state) → { state', events }     pure · seeded · replayable   ║  │
│  ║    AGENTS: departments · employees · projects · execs · customers · mkt ║  │
│  ║    STATE: cash·revenue·morale·demand·innovation·techDebt·reputation·risk║  │
│  ╠═════════════════════════════════════════════════════════════════════════╣  │
│  ║  LEVEL 2 — WORKFLOW ORCHESTRATION  (mandatory · no LLM)   [Phase 2]     ║  │
│  ║    scheduler · board meetings · notifications · reports · n8n adapter    ║  │
│  ╠═════════════════════════════════════════════════════════════════════════╣  │
│  ║  LEVEL 3 — AI REASONING  (OPTIONAL · degrades gracefully)   [Phase 3]   ║  │
│  ║    Advisor interface → [ rule-based ▸ Ollama ▸ cloud LLM ]               ║  │
│  ║    explains · summarizes · narrates — NEVER writes org state             ║  │
│  ╚═════════════════════════════════════════════════════════════════════════╝  │
│                                                                               │
│  PERSISTENCE  ·  in-memory world  ⇄  localStorage/IndexedDB (Phase 1)         │
└─────────────────────────────────────────────────────────────────────────────┘

DEPENDENCY LAW:  Browser ─► EngineClient ─► (L1 ⇒ L2 ⇒ L3)
                 nothing outside the engine mutates org state.
                 delete L3 entirely → platform still fully alive.

WHY THE ENGINE IS IN THE BROWSER (V1):  the user only ever sees the frontend, and
polish needs a tight loop. In-process = no network, no second deploy, 60fps motion
off in-memory state, one Vercel app, zero cost. The EngineClient seam keeps the
Python/FastAPI door open for when simulation weight actually demands it (adr/0001).
```
