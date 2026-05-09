# Architecture — mapping the idea onto the starter

The starter ships a **Notion Leads** demo. We're swapping that domain out for **GitHub PR Review** while keeping the four-service shape (frontend / bff / agent / mcp) and the protocols that make the demo work.

## Service responsibilities (after swap)

| Service | Role |
|---|---|
| `apps/frontend` | Next.js + CopilotKit UI. Renders the canvas (graph + heatmap + risk panel) and the chat side panel. |
| `apps/bff` | Hono BFF. Bridges chat → agent (LangGraph) and serves CopilotKit's runtime. Routes MCP tool calls. |
| `apps/agent` | Python LangGraph "deep agent". Plans the review, fetches PR data via tools, runs the risk pass, emits A2UI updates back to the canvas. |
| `apps/mcp` | TypeScript `mcp-use` server. Exposes MCP tools (GitHub: get_pr, get_diff, post_comment, approve, request_changes) and MCP-Apps widgets. |

## File-level swap plan

### Keep (infrastructure — do not touch)
- `apps/bff/src/server.ts` — Hono routes; only the upstream URLs change (already correct).
- `apps/frontend/src/app/layout.tsx`, `globals.css` — chrome.
- `apps/frontend/src/components/copilot/`, `threads-drawer/`, `ui/` — chat panel + threads + primitives.
- `deployment/`, `scripts/`, `.env` plumbing — fully reused.

### Replace (domain code)
| Notion-Leads file | Becomes | Notes |
|---|---|---|
| `apps/agent/src/lead_state.py` | `apps/agent/src/review_state.py` | TypedDict for PR + files + risk findings |
| `apps/agent/src/lead_store.py` | `apps/agent/src/review_store.py` | In-mem store of analyses keyed by PR URL |
| `apps/agent/src/canvas.py` | `apps/agent/src/canvas.py` (rewrite) | A2UI emitters: `graph_update`, `risk_update`, `findings_update` |
| `apps/agent/src/notion_integration.py` | `apps/agent/src/github_integration.py` | Octokit-style fetch via PAT |
| `apps/agent/src/notion_mcp.py` | `apps/agent/src/github_mcp.py` | Wires the MCP tools the agent calls |
| `apps/agent/src/notion_tools.py` | `apps/agent/src/github_tools.py` | `get_pr`, `get_diff`, `post_comment`, `approve`, `request_changes` |
| `apps/agent/src/prompts.py` | (rewrite) | Planner + risk-pass prompts |
| `apps/agent/src/runtime.py` | (light edit) | Same deep-agent shape, new system prompt + tools |
| `apps/frontend/src/app/leads/` | `apps/frontend/src/app/review/` | Canvas page; redirect `/` → `/review` |
| `apps/frontend/src/components/leads/` | `apps/frontend/src/components/review/` | `<DependencyGraph>`, `<RiskHeatmap>`, `<FindingPanel>` |
| `apps/mcp/src/lib/leads/` | `apps/mcp/src/lib/review/` | MCP tool handlers + widget render fns |
| `apps/mcp/src/components/Frame.tsx` | reuse | Generic widget frame is domain-agnostic |

### New
- `apps/frontend/src/components/review/DependencyGraph.tsx` — react-flow + dagre, takes A2UI `graph_update`.
- `apps/frontend/src/components/review/RiskHeatmap.tsx` — file tree coloured by risk score.
- `apps/frontend/src/components/review/FindingPanel.tsx` — list of findings with action buttons that call MCP tools.
- `apps/agent/src/risk_pass.py` — single LLM call: input = file diff + nearby code, output = `{risk, why, blocking_invariant}`.

## Protocol surfaces (where each one shows up)

- **A2UI** — `canvas.py` emits three update types (`graph_update`, `risk_update`, `findings_update`). Frontend has one renderer per type. New PR = new graph topology = A2UI re-render, not a fixed dashboard.
- **AG-UI** — clicking a node in the graph sends `{action: "rescope", file: "..."}` upstream. The agent picks it up mid-thread and re-runs the risk pass on a narrower scope. Same channel as the chat.
- **MCP Apps** — the FindingPanel widget is rendered by the MCP server (`apps/mcp/src/lib/review/`). Buttons inside it call back into MCP tools without going through the agent.
- **MCP tools** — exposed by `apps/mcp/src/lib/review/tools.ts`: `github_get_pr`, `github_get_diff`, `github_post_comment`, `github_approve`, `github_request_changes`. Agent calls them; widget buttons also call them directly for fast actions.

## Env vars to add
```
GITHUB_PAT=ghp_xxx                # repo + PR comment scope
GITHUB_DEMO_PR=https://github.com/owner/repo/pull/123
```

## What the canvas looks like
```
+--------------------------------------------------+ +-------------+
|                                                  | |             |
|        DependencyGraph (react-flow + dagre)      | |  Chat panel |
|                                                  | |             |
|                                                  | |  (CopilotKit|
+--------------------------------------------------+ |   sidebar)  |
| RiskHeatmap (file tree, colour-coded)            | |             |
+--------------------------------------------------+ |             |
| FindingPanel (list, actions: approve / comment)  | |             |
+--------------------------------------------------+ +-------------+
```
