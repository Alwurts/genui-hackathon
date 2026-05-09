# Architecture — lens-driven PR review on the starter

The starter ships a Notion-Leads demo. We swap **domain only** — keep the four-service shape, the deep-agent runtime, the CopilotKit shared-state pattern, the dual-MCP layout, all three GenUI tiers.

## Service map (post-swap)

| Service | Role | Reuse vs change |
|---|---|---|
| `apps/frontend` | Next.js + CopilotKit. Canvas + chat sidebar. | Keep chrome (`copilot/`, `threads-drawer/`, `ui/`). Replace `app/leads/` + `components/leads/` with `app/review/` + `components/review/`. |
| `apps/bff` | Hono BFF. Bridges chat → agent and serves CopilotKit runtime. | Unchanged (env URLs already correct). |
| `apps/agent` | Python LangGraph deep agent. | Replace lead-domain modules; keep `runtime.py`, `timing.py`, `intelligence_cleanup.py`. |
| `apps/mcp` | TS `mcp-use` server. Exposes our review system as an MCP server (track-4 anchor) + tier-3 drill-in widget. | Replace `lib/leads/` with `lib/review/`. Keep `components/Frame.tsx`. |

## Canvas state contract

Lives in CopilotKit shared state (`useAgent()`); agent calls frontend tools to mutate.

```ts
type ReviewState = {
  pr: { url, title, author, base, head, files_changed, additions, deletions } | null
  lens: { id, name, instruction, boost_keywords } | null

  scores: {
    summary: string
    perFile: { path, max_score, avg_score, hunk_count }[]
    perHunk: {
      hunk_id, file, line_start, line_end,
      score: 0..10, reasons: string, tags: string[]
    }[]
    crossCutting?: { title, files: string[], why }[]   // optional
    status: 'idle' | 'scoring' | 'error'
  } | null

  diff: {
    files: { path, hunks: { hunk_id, header, lines: { type, content }[] }[] }[]
  } | null

  ui: { selectedHunkId?: string, expandedFiles: string[], showLowScoreHunks: boolean }
}
```

Scores are **replaced** on lens switch (not merged). Diff lives in canvas state so re-renders under different lenses don't refetch from GitHub.

## Frontend tools (declared in React via `useFrontendTool`)

| Tool | Effect on `ReviewState` |
|---|---|
| `setPR(pr)` | replace `state.pr` |
| `setDiff(diff)` | replace `state.diff` |
| `setLens(lens)` | replace `state.lens`, set `state.scores.status = 'scoring'` |
| `setScores(scores)` | replace `state.scores`, status `idle` |
| `setSummary(text)` | streamable into `state.scores.summary` |
| `setScoringStatus(status)` | progress flag |
| `highlightHunks(ids)` | UI emphasis (visual only) |
| `selectHunk(id)` | open drill-in panel |
| `setShowLowScoreHunks(bool)` | collapse/expand low-importance hunks |

## Agent tools (Python, registered with `create_deep_agent(tools=[...])`)

**GitHub (direct REST via `httpx` + PAT — no MCP wrapper):**
- `fetch_pr(url) -> PR` — metadata + file list
- `fetch_pr_files(pr) -> Files` — patches per file (parsed locally into hunks)
- `post_review_comment(pr, file, line, body)` — inline PR comment
- `submit_review(pr, decision, summary)` — `approve` | `request_changes` | `comment`

**Internal:**
- `score_pr_under_lens(pr_data, lens) -> HunkScores` — single batched call to **Gemini 3 Pro Preview** with `response_schema` returning per-hunk scores. The expensive call.
- `compile_lens_from_text(description) -> Lens` — small Flash-Lite call producing `{instruction, boost_keywords}`. Used for custom lens path.
- `drill_into_hunk(hunk, lens) -> Explanation` — deeper reasoning pass on click. Stretch.

Model selection is in code, not env (`apps/agent/src/scoring.py` imports the Pro client directly). Only API keys go in `.env`.

## Custom MCP server (`apps/mcp/`)

The review brain is exposed as an MCP server so external clients (Claude Desktop, ChatGPT) can call it. Tools:

- `analyze_pr(url, lens)` — full pipeline: fetch + score + summary
- `score_hunks(pr_id, lens)` — scoring only
- `get_review_summary(pr_id, lens)` — final summary

Plus the tier-3 GenUI surface — the **drill-in widget** rendered via mcp-use widget convention (uses `Frame.tsx`).

## File-level swap plan

### Keep (touch only if necessary)
- `apps/bff/src/server.ts`, deployment, scripts, env plumbing.
- `apps/frontend/src/app/layout.tsx`, `globals.css`.
- `apps/frontend/src/components/copilot/`, `threads-drawer/`, `ui/`.
- `apps/agent/src/{runtime,timing,intelligence_cleanup}.py`.
- `apps/mcp/src/components/Frame.tsx`.

### Replace (domain code)
| Old | New | Notes |
|---|---|---|
| `apps/agent/src/lead_state.py` | `review_state.py` | TypedDict matching `ReviewState` |
| `apps/agent/src/lead_store.py` | `review_store.py` | In-mem cache keyed by PR URL |
| `apps/agent/src/notion_integration.py` | (delete) | direct API instead |
| `apps/agent/src/notion_mcp.py` | (delete) | no external GitHub MCP |
| `apps/agent/src/notion_tools.py` | `github_api.py` | `fetch_pr`, `fetch_pr_files`, `post_review_comment`, `submit_review` |
| (new) | `scoring.py` | `score_pr_under_lens`, `compile_lens_from_text` |
| (new) | `lenses.py` | three preset definitions |
| `apps/agent/src/canvas.py` | rewrite | doc the React-side frontend-tool contract |
| `apps/agent/src/prompts.py` | rewrite | review-domain system prompt + scoring prompt template |
| `apps/frontend/src/app/leads/` | `apps/frontend/src/app/review/` | canvas page; redirect `/` → `/review` |
| `apps/frontend/src/components/leads/` | `apps/frontend/src/components/review/` | `<PRHeader>`, `<LensSwitcher>`, `<FilesRail>`, `<HunkCard>`, `<LensSummaryCard>` |
| `apps/frontend/src/lib/leads/` | `apps/frontend/src/lib/review/` | `types.ts`, `state.ts`, `derive.ts` |
| `apps/mcp/src/lib/leads/` | `apps/mcp/src/lib/review/` | MCP tool handlers + drill-in widget |

### New
- `apps/frontend/src/components/review/LensSummaryCard.tsx` — A2UI declarative renderer (tier 2).
- `apps/frontend/src/components/review/DrillInPanel.tsx` — embeds the MCP App iframe (tier 3).
- `apps/agent/src/lenses.py` — three preset Lens objects.
- `apps/agent/src/scoring.py` — Gemini 3 Pro client; structured-output schema; batched call.

## Env vars (additions)

```
GITHUB_PAT=ghp_xxx                          # repo + PR comment scope
GITHUB_DEMO_PR=https://github.com/owner/repo/pull/123
# (no GEMINI_SCORING_MODEL — selection is in code)
```

## Canvas layout

```
+-------------------------------------------------+ +-----------+
| <PRHeader>                                      | |           |
+-------------------------------------------------+ |  Chat     |
| <LensSwitcher>  [Money] [Architecture] [Tests]  | |  sidebar  |
+--------+----------------------------------------+ |           |
|        |                                        | | (CopilotKit)
| Files  |  <LensSummaryCard>  (A2UI tier 2)      | |           |
| rail   |                                        | |           |
| (heat- |  ---- diff body, re-ordered ----       | |           |
|  map)  |  <HunkCard #1>  expanded, annotated    | |           |
|        |  <HunkCard #2>  expanded               | |           |
|        |  <HunkCard #3..>  collapsed            | |           |
+--------+----------------------------------------+ |           |
| <DrillInPanel>  (MCP App iframe, tier 3)        | |           |
+-------------------------------------------------+ +-----------+
```
