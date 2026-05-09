# Build plan — phased, with hard cuts

Three milestones. Each leaves the demo in a shippable state. Stop at v1 by 15:00; only attempt v1.5 if v1 is fully end-to-end.

## v1 — beats 1, 2, 3 on the cached fallback PR
*Goal: 90s demo works on cached data, three preset lenses, real GitHub comment posts.*

### v1.0 — domain swap (frontend chrome only, no agent yet)
- Rename `apps/frontend/src/app/leads/` → `app/review/`. Redirect `/` to `/review`.
- Rename `components/leads/` → `components/review/`. Stub each as a placeholder reading from `ReviewState`.
- Rewrite `lib/leads/{types,state,derive}.ts` → `lib/review/...`. Define `ReviewState` per `architecture.md`.
- Boot — page renders empty canvas, no errors.

### v1.1 — hand-crafted demo PR + cached analysis
- Seed `data/demo-pr.json` with a fake PR + diff structure (no GitHub call needed).
- Seed `data/demo-scores.json` with three pre-computed score sets (one per preset lens).
- Frontend loads `demo-pr.json` at boot when `GITHUB_DEMO_PR=cached://demo`. Lens switcher just swaps which `demo-scores` entry is active. **This already demos beats 1 and 2 with zero agent running.** Sanity check before agent work.

### v1.2 — controlled-tier components (the spine)
- `<PRHeader>` — title, author, base→head, file/line counts.
- `<LensSwitcher>` — three preset cards; click → `setLens` (frontend tool).
- `<FilesRail>` — list of files, each colour-coded by `perFile.max_score`.
- `<HunkCard>` — header + lines + score badge + reason. Collapsed if `score < threshold && !showLowScoreHunks`.
- Re-order hunks by `perHunk.score` desc.

### v1.3 — agent + GitHub direct API + scoring
- `apps/agent/src/github_api.py` — `fetch_pr`, `fetch_pr_files` via `httpx`.
- Hunk parser — split unified diff patches into `{hunk_id, header, lines}`.
- `apps/agent/src/lenses.py` — three preset Lens objects.
- `apps/agent/src/scoring.py` — `score_pr_under_lens` calling Gemini 3 Pro Preview with `response_schema`.
- Wire the deep agent: on chat input "review <url>", agent calls `fetch_pr` → `fetch_pr_files` → `score_pr_under_lens(default_lens)` → frontend tools to populate state.
- On `setLens` from UI, agent re-runs `score_pr_under_lens` and replaces scores.

### v1.4 — beat 3 (comment via MCP / direct API)
- `apps/agent/src/github_api.py` — `post_review_comment`.
- Drill-in panel: simple controlled component (NOT the MCP App iframe yet) — agent emits a `selectHunk` plus a streamed reasoning paragraph into `state.scores.summary` or a side field. "Comment on this hunk" button → frontend tool → agent calls `post_review_comment`.

### v1.5 gate (15:00 cut point)
If v1.0–1.4 are working end-to-end on the cached PR, proceed. Otherwise: cut, polish v1, demo as-is.

---

## v1.5 — A2UI + custom lens + live PR fetch

### v1.5a — A2UI lens summary card
- `<LensSummaryCard>` renders A2UI tree from `state.scores.crossCutting` or a new `state.lensSummary` field.
- Agent emits a different A2UI tree per lens — Money: call-sites table; Architecture: affected-modules list; Tests: coverage bars. Hardcode three small templates initially.

### v1.5b — custom lens
- "Custom lens…" input in `<LensSwitcher>`. On submit, frontend calls `compile_lens_from_text` → agent returns Lens → `setLens`.

### v1.5c — live paste real PR
- Detect PR URL in chat input. Skip the cached fallback. Real `fetch_pr` runs.
- Pre-validate one specific real public PR before the event; cache its analysis as a backup.

---

## v2 (16:00+ only) — MCP App + deployed MCP server

### v2a — MCP App drill-in widget
- `apps/mcp/src/lib/review/drill-widget.ts` — emits HTML iframe content for a hunk.
- Frontend `<DrillInPanel>` swaps from controlled to MCP App iframe.
- Buttons inside iframe call back to MCP tools (`post_review_comment`, `request_changes`).

### v2b — deploy custom MCP server publicly
- Push `apps/mcp/` to a public URL (Cloudflare or Vercel).
- Demo Claude Desktop calling `analyze_pr(url, lens)` against it. Closer of the demo.

### v2c — Linear/Notion MCP integration
- Wire one external MCP for "spawn task from finding". Deep stretch.

---

## Day-of timeline (mapped to plan)

| Time | Milestone |
|---|---|
| 13:00 | Start v1.0 (domain rename) |
| 13:30 | v1.1 cached demo working — beats 1+2 visible without agent |
| 14:00 | v1.2 controlled chrome polished |
| 14:30 | v1.3 agent + scoring working on cached PR |
| 15:00 | **CUT POINT** — v1.4 (comment posting) must work or skip beat 3 |
| 15:30 | v1.5a A2UI summary card if comfortable |
| 16:00 | **DEPLOY** — v1 to public URL on Cloudflare/Vercel |
| 16:45 | Demo dry-run on the deployed URL |
| 17:00 | Show and tell |
| 18:00 | Submit |

## Rules of thumb (project-specific)
- Cached demo PR is **always the primary**; live paste is a stretch. Demo on the cache.
- Every v1.x ends with the canvas in a demo-able state.
- If a lens disagreement isn't visible on the demo PR, hand-tune the cached scores until it is. The demo is a demo.
- One scoring call ≠ one lens. Pre-compute all three lenses' scores at boot for the cached PR.
- Don't touch `apps/bff/`, `runtime.py`, or Docker/env plumbing — they work.
