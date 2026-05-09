# Lens-Driven PR Review Agent

## One-liner
Paste a PR. Pick a **lens** ("Money/Risk", "Architecture", "Tests/Quality"). The agent re-scores every diff hunk under that lens; the entire UI re-orders, re-summarises, and re-renders around what matters to *your* business. Same PR through a different lens = a completely different review.

## Why this is the demo
PR review hasn't kept up with how much code agents now write. Tools answer "is this code correct?" — but the interesting question is "do these changes matter to **our** business?". Importance is contextual, and existing tools don't model context.

## What's on screen
- **Top:** PR header (title, author, base→head, file/line counts).
- **Lens switcher:** 3 hardcoded presets + a "Custom lens…" input (free-text → small Flash-Lite call compiles into the same internal lens shape).
- **Files rail (left):** every changed file, max-score per file colour-coded (heatmap).
- **Diff body (centre):** hunks **re-ordered by importance under active lens**. High-score hunks expanded with annotation; low-score hunks collapse to one-liners.
- **Lens-specific summary card (top of diff):** declarative (A2UI) — different layout per lens. Money lens → call-sites mini-table. Architecture lens → affected-modules graph. Tests lens → coverage-gap bars.
- **Drill-in (on hunk click):** open-ended (MCP App iframe) — agent generates an HTML widget with deeper reasoning + action buttons (`Comment`, `Request Changes`).

## Lenses (v1)
Three presets, designed to **disagree** on the demo PR (each picks a different file as #1):

| Lens | Boosts |
|---|---|
| **Money / Risk** | billing, transactions, money-typed fields, auth, PII |
| **Architecture** | public APIs, cross-module imports, type signatures |
| **Tests / Quality** | missing coverage, error-handling gaps, removed tests |

Custom lens (v1.5): free-text → Flash-Lite compiles to `{system_instruction, boost_keywords}`.

## GenUI spectrum coverage (the kit's three tiers)
| Tier | Where it shows up |
|---|---|
| Controlled (`useComponent`) | Canvas chrome — PR header, lens switcher, files rail, hunk cards |
| Declarative (A2UI) | Lens-specific summary card; layout differs per lens |
| Open-ended (MCP App) | Hunk drill-in widget; agent-generated HTML in sandboxed iframe |

## Track coverage (the four judging tracks)
- **T1 Dynamic components** — lens-switch re-renders; A2UI summary differs per lens.
- **T2 Agentic feedback** — lens click and hunk click trigger agent re-reasoning.
- **T3 Latency** — pre-cached demo PR analysis; status indicators while smart-model re-scores; Gemma local stretch.
- **T4 Tool-enabled** — real GitHub comments + reviews via direct API; **the review brain itself is exposed as an MCP server** so Claude/ChatGPT can call it.

## Demo script (90s on stage)
1. **Load + first lens (~30s).** Paste real public PR URL. Canvas loads. Default lens: Architecture. Public-API rewrite floats to #1; A2UI summary shows affected modules.
2. **Switch lens (~30s).** Click "Money/Risk" preset. "Re-scoring under Money…" status. Billing change is now #1; architecture rewrite drops; A2UI summary swaps to money-touching call sites. *This is the wow moment.*
3. **Drill + act (~30s).** Click #1 hunk → MCP App iframe pops in with deeper reasoning + "Comment on this hunk" button. Click → real GitHub comment posts.
4. **Closer (~10s).** "Same canvas, three GenUI tiers — controlled chrome, declarative summaries, open-ended drill-in. And the review brain we just used is also a deployed MCP server — Claude can call it directly." Show MCP server URL.

## Demo PR target
- **Primary (path A):** live-paste a real public PR. Pre-validated before stage.
- **Fallback (path C):** hand-crafted PR on a small demo repo we seed today (~15 files across `billing/`, `auth/`, `cart/`, `tests/`, `docs/`), designed so the three lenses disagree on which file is #1. Cached analysis loaded at boot — works even if network blips.

## Scope hard-cuts (locked at 15:00 on event day)
- v1 ships beats 1–3 with the three preset lenses on the cached demo PR.
- v1.5 (only after v1 passes end-to-end): custom lens, A2UI summaries for all three lenses, live-paste path.
- v2 (only after 16:00 if comfortable): MCP App drill-in, deployed public MCP server, Linear/Notion MCP "spawn task from finding".
- Cut without ceremony: dependency graph, side-by-side lens comparison, "what breaks if I merge", local Gemma model.

## Risks
- **Gemini 3 Pro Preview rate limits or instability on event day** → fallback is changing one line in `scoring.py` to point at Claude Sonnet 4.6 (already wired in `runtime.py`).
- **Real PR fetch fails on stage** → fallback is the cached hand-crafted PR loaded at boot.
- **Lens disagreement isn't visually obvious on a real PR** → fallback PR is engineered to make disagreement crisp.
- **Scope creep on the diff renderer** → ship a minimal hunk component first, polish only after beats 1–3 work end-to-end.
