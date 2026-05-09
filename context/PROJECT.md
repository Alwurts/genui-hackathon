# Project: Lens — A Role-Aware, Agent-Driven PR Review Surface

> Working name: **Lens**. Submission to the Generative UI Global Hackathon (Google × CopilotKit).

---

## Problem

Pull requests have grown beyond what a human can review linearly. A 40-file PR mixing a SQL migration, an auth refactor, a React component, and a dependency bump asks every reviewer to play every role: security, DBA, frontend, backend, PM. The result:

- **Reviewers skim or rubber-stamp** because they can't locate the part that matters to *them*.
- **Critical signals get buried** — a permissions change hides under 30 files of refactoring.
- **Feedback is noisy** — a frontend dev leaves comments on backend code they don't fully understand, and the actual blast radius (which endpoints, which consumers, which ownership boundaries) is invisible.
- **Context is non-portable** — a reviewer interrupted mid-review loses their place; the next session restarts from zero.

GitHub's review UI treats every reviewer identically. It shows a flat file diff and trusts the human to triage. For modern PRs touching multiple domains, that's no longer enough.

## Our solution

A PR review surface that **reorders itself around the reviewer's lens**, lets an embedded agent **synthesize, filter, and visualize** the change, and **persists conversational context per PR** so review can be paused and resumed across sessions.

Three differentiators:

1. **Lens-driven prioritization** — the same PR shows different "first thing you see" content depending on whether you're reviewing as a security engineer, DBA, frontend dev, backend dev, or PM. Same human can switch lenses per PR.
2. **Agent-generated review components** — the chat doesn't just reply with text. It returns A2UI components: a blast-radius diagram, an ownership card, a before/after auth flow, a decision summary.
3. **Per-PR persistent chat with multi-PR awareness** — Linear-style floating dock. Each open conversation is pinned to a PR, with status indicators (unread, processing, resolved). Switch PRs, your context follows.

## Target users

Engineering teams of 3–50 reviewing 5–30 PRs/week, where individual PRs span multiple domains. Specifically:

- The **busy reviewer** scanning 8 PRs in 20 min before standup
- The **specialist** (security, DBA, SRE) auto-pulled in on cross-cutting changes
- The **PM / TL** approving without reading code, needing risk + scope synthesis

---

## Key features (hackathon scope)

### 1. Dashboard — PR list
- Authenticated GitHub PR list scoped to the user
- Per-PR badges: lens-relevance score, # concerns flagged by agent, stale time
- Filter by repo, author, label, lens-relevance
- Click → PR detail

### 2. PR detail — lens-prioritized feed
- **Single scrollable column** of collapsible sections (no tabs).
  - Categories: Security · Database · Backend API · Frontend · Tests · Docs · Infra · Performance
- Section ordering and expansion state are **driven by the active lens**. Security lens → Security + Database expanded at top; Frontend lens → Frontend + Tests at top.
- Top-of-page **chip row** to show/hide categories, pin a category, or mute irrelevant ones.
- Each section can host **agent-injected components inline** (e.g. a diff diagram inside the Security section).

### 3. Lens switcher ("View as…")
- Top-right control. Lenses: **Security · Database · Backend · Frontend · PM · QA**.
- Demo-only profile menu lets the reviewer change their default; per-PR override is one click.
- Reframed as a *lens*, not an identity — same human, different perspective per PR.

### 4. Per-PR chat dock (Linear-pattern)
- Floating dock bottom-right. Multiple PR chats stack as tabs/chips with the PR number + a status dot:
  - **grey** idle · **blue** processing · **amber** unread reply · **green** resolved
- Chat is pinned to the PR — switching PRs swaps which chat is active; closed PRs persist in the dock.
- Replies can be plain text **or A2UI components** rendered inline in the conversation.

### 5. Agent-returned components (the A2UI demo surface)
The agent returns at least these component types:

| Component | When it fires | Tier |
|---|---|---|
| **Blast-radius map** | "what does this PR touch?" | A2UI |
| **Ownership card** | "who owns this file?" | A2UI |
| **Before/after flow** | "explain the auth change" | A2UI |
| **Risk summary** | "should I be worried?" | A2UI |
| **Test coverage chip** | "is this tested?" | Controlled |
| **Decision summary** | end-of-review CTA | Controlled |
| **Inline diff highlight** | "show me the unsafe regex" | Controlled |

### 6. Blast-radius visualization
- **Layered left-to-right Sankey/dependency map**, not a force-directed graph.
- Left column: changed files. Middle: affected modules. Right: downstream surfaces (endpoints, components, jobs, consumers).
- Edge thickness = call frequency or coupling weight. Click an edge to filter the section feed to just that path.

### 7. Decision summary panel
- After the reviewer scrolls, a sticky panel offers the synthesis:
  - "3 concerns flagged · 2 resolved · 1 open"
  - Buttons: **Approve · Request changes · Comment**
- This is the closing-the-loop screen that turns the agent from "advisor" into "co-reviewer."

---

## User flow

```
1. Sign in with GitHub
        │
        ▼
2. Dashboard: list of PRs, badged with lens-relevance + concern count
        │ click a PR
        ▼
3. PR detail loads with active lens applied
   ├─ Lens-prioritized section feed (collapsible groups)
   ├─ Blast-radius map at top (agent-rendered)
   └─ Sticky decision summary at bottom
        │
        │ user can:
        │   • flip lens (top-right) — feed reorders live
        │   • toggle category chips — sections show/hide
        │   • open chat dock — ask questions, get components back
        │   • click an edge in the blast map — feed filters to that path
        ▼
4. Resolve concerns (mark addressed, request change, comment)
        │
        ▼
5. Decision summary updates → Approve / Request changes / Comment
        │
        ▼
6. Back to dashboard. Chat for that PR remains in the dock until dismissed.
```

---

## Stack mapping (hackathon protocols)

| Layer | Tool | Used for |
|---|---|---|
| **Auth / data** | GitHub OAuth + REST/GraphQL | PR list, diffs, file tree, ownership |
| **Agent runtime** | LangChain Deep Agents (from starter kit) | Multi-step PR analysis, lens prioritization, blast-radius computation |
| **Agent ↔ UI bridge** | **AG-UI** (CopilotKit) | Streaming agent state, tool calls, shared review state |
| **App framework** | **CopilotKit** + Next.js | Chat dock, generative UI hooks, persistent threads per PR |
| **Component delivery** | **A2UI** | Agent-returned blast-radius map, ownership cards, before/after flows |
| **MCP surface** | **MCP App** via mcp-use | Optional: expose "Lens review" inside Claude/ChatGPT for the deployable demo |
| **Model** | Gemini 3.1 Flash-Lite (default) | PR summarization, lens scoring, component generation |
| **Design system** | AI Elements (shadcn-based) | Chat conversation, prompt input, code blocks, message components |

### How each hackathon judging criterion is hit

- **Dynamic Component Generation** — the section feed reorders on lens change; the agent emits A2UI components per question.
- **Agentic Feedback Loops** — clicking an edge in the blast-radius map steers the agent to filter the feed; the chat is bidirectional with the visible UI state.
- **Latency-Optimized Rendering** — Gemini Flash-Lite + streamed A2UI components (progressive render); section skeletons paint immediately, agent fills in.
- **Tool-Enabled Interfaces** — chat actions can call: "request changes on this hunk," "ping owner," "open Linear ticket," "approve PR" — real cross-app workflows via MCP.

---

## Team & scope

4-person team. Hackathon timeline.

**MVP (must ship):**
1. GitHub auth + PR dashboard
2. PR detail with lens switcher + filterable section feed
3. Chat dock with per-PR persistence
4. At least 2 agent-returned A2UI components (blast-radius map + decision summary)

**Stretch:**
- Multi-PR chat indicators with status dots
- Inline component injection inside section bodies
- MCP App deployment so the same agent runs in Claude/ChatGPT
- Real GitHub write actions (approve, comment, request changes)

**Cut from v1:**
- Comment threading parity with GitHub
- Per-line annotation editor
- Force-directed full repo graph (replaced by Sankey)
- Org/team admin surfaces

---

## Design notes

- **Visual system:** AI Elements (shadcn). Geist font, OKLCH neutral palette, dark-first, `rounded-lg`, subtle borders, no heavy shadows.
- **Information density:** high — reviewers want to scan. Avoid hero space; prefer compact rows, chips, badges.
- **Motion:** minimal. Section reorder on lens change should animate (≤200ms) so the user *sees* prioritization happen — that animation is the demo moment.
- **Don't:** build a force-directed graph, hide content behind tabs, make the chat modal block the page, gate features behind onboarding.
