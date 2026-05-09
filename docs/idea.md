# Semantic GitHub Code Review Agent

## One-liner
An agentic PR reviewer that **renders** its analysis as an interactive dependency graph + risk heatmap. The reviewer steers it by clicking nodes, scoping files, or accepting findings — the agent re-reasons live and posts real GitHub comments via MCP tools.

## Why this hits all four tracks
- **Dynamic component generation (A2UI)** — the dependency graph, file heatmap, and risk panels are generated per-PR; no fixed layout.
- **Agentic feedback loops (AG-UI)** — clicking a node, marking "ignore", or re-scoping a module triggers the agent to re-analyse in real time.
- **Latency-optimized rendering** — semantic relationship + risk detection runs on a small/local model (Gemma 4 / Flash-Lite) so re-analysis feels instant.
- **Tool-enabled interfaces (MCP)** — buttons in the UI ("approve", "comment", "suggest refactor", "open in IDE") map to MCP tools that hit the real GitHub API.

## Demo script (the 10s that sells it)
1. Paste a real PR URL into the chat.
2. Graph materialises: nodes = files / modules, edges = imports/calls, colour = risk.
3. Click a "high-risk" node → agent re-reasons → highlights the call site that breaks an invariant.
4. Click "comment" inside the widget → a real GitHub PR comment is posted.

That's the entire wow moment. Everything else is supporting cast.

## Scope hard-cuts (locked at 15:00)
- One hard-coded demo PR works end-to-end before generalising.
- Graph layout: dagre/elkjs is fine. No custom layout engine.
- Risk model: a single prompt that returns `{file, risk: low|med|high, why}`. No fine-tuning.
- MCP tools: just `post_comment`, `approve_pr`, `request_changes`. Skip "open in IDE" until everything else ships.
- No auth flow on stage — use a pre-set GitHub PAT in `.env`.

## Risks & mitigations
- **Graph rendering scope creep** → ship dagre + react-flow with hard-coded styles; do not tweak visuals after 15:00.
- **GitHub rate limits during demo** → cache the analysis for the demo PR; fall back to cached state if the live call fails.
- **Local model setup eats the morning** → start with Gemini Flash-Lite (already wired in the starter); only swap in Gemma 4 if everything else is done by 15:00.

## CDMX-local bonus (cheap judge points)
- Bilingual UI labels (EN/ES toggle).
- Demo PR could be on a Mexican OSS project if one fits.
