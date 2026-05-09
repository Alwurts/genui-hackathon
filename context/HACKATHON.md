# Generative UI Global Hackathon: Agentic Interfaces

**Organizers:** Google × CopilotKit  
**Theme:** Beyond the Chatbox — building AI interfaces that go beyond text

---

## The Challenge

Build functional prototypes that push the boundaries of how users interact with AI. Systems must demonstrate one or more of:

| Criterion | What it means |
|---|---|
| **Dynamic Component Generation** | UI that adapts its structure and state based on the model's reasoning at runtime |
| **Agentic Feedback Loops** | Interfaces letting users steer autonomous agents through interactive, real-time visual elements |
| **Latency-Optimized Rendering** | KV cache optimization or local execution (Gemma 4 / Muse Spark) for fluid, zero-lag UX |
| **Tool-Enabled Interfaces** | UI that provides interactive hooks for agents to execute cross-app workflows |

---

## Required Protocols & Frameworks

| Tool | Role |
|---|---|
| **A2UI** (Google) | Open protocol for agents to send interactive components. Apache 2.0 |
| **AG-UI** (CopilotKit) | Protocol connecting AI agents to frontend UIs |
| **CopilotKit** | Framework for embedding AI copilots into React apps |
| **MCP Apps** | Model Context Protocol applications rendered as interactive UI |

---

## Generative UI Spectrum

The starter kit is wired for all three tiers — mix and match as needed.

### 1. Controlled — `useComponent`
The developer provides predefined React components; the agent selects and populates them with props. Stays on-brand and pixel-perfect. Best for repeatable, standard workflows.  
Docs: [CopilotKit Display Components](https://docs.copilotkit.ai/generative-ui/your-components/display-only)

### 2. Declarative — `A2UI`
Uses the A2UI spec to map agent outputs to a catalog of renderers. Balances control and flexibility — handles the "long tail" of varied UI layouts without a unique tool per component. Gemini emits A2UI components; the renderer paints them; no executable code reaches the client.  
Docs: [CopilotKit A2UI](https://docs.copilotkit.ai/generative-ui/a2ui)

### 3. Open-ended — `MCP Apps` / `openGenerativeUI`
Agent generates raw HTML rendered in a sandboxed double-iframe. Most flexible (disposable, data-grounded interfaces on the fly) but hardest to style consistently.  
Docs: [MCP Apps](https://docs.copilotkit.ai/generative-ui/mcp-apps) · [Open Generative UI](https://docs.copilotkit.ai/generative-ui/open-generative-ui)  
Demo: [opengenerativeui.copilotkit.ai](https://opengenerativeui.copilotkit.ai/)

---

## Starter Kit

**Repo:** https://github.com/jerelvelarde/Generative-UI-Global-Hackathon-Starter-Kit

A complete Next.js + Python LangGraph application wired with:
- **CopilotKit** — durable conversation threads, AG-UI bridge, generative UI surface
- **LangChain Deep Agents** — planning, sub-agent dispatch, virtual filesystem, TODO loop
- **Gemini 3.1 Flash-Lite** — default model (swap to Pro/Flash or OpenAI/Anthropic in one line)
- **A2UI** — declarative component streaming from Gemini
- **Notion MCP via mcp-use** — Leads database demo; swap to any MCP server with one config edit
- **Manufact / mcp-use** — deployable MCP server (`apps/mcp/`) running in Claude or ChatGPT
- **Daytona** — sandboxed agent code execution (<90ms spin-up)

### Quick Start

```bash
npx @copilotkit/cli@latest init   # select "Intelligence" when prompted
# Add GEMINI_API_KEY to .env and apps/agent/.env
npm install
npm run dev        # or npm run dev:full (includes MCP server)
```

### App Structure

```
apps/
  frontend/   Next.js UI (CopilotKit, A2UI renderer, canvas)
  agent/      Python LangGraph Deep Agent + Notion MCP
  mcp/        Deployable MCP server (mcp-use)
dev-docs/     Architecture, setup, model-switching, troubleshooting guides
data/         Notion leads sample CSV/ZIP
```

### Key Features

- **Persistent threads** — conversations survive reloads; named + listed in sidebar
- **Agent-driven canvas** — Lead cards, follow-up notes, charts the AI creates/edits live
- **Real integrations via MCP** — Notion Leads DB out of the box
- **Deployable MCP server** — runs in Claude / ChatGPT natively
- **Generative UI primed** — stream Gemini-rendered A2UI components without re-plumbing

---

## Protocol Deep-Dives

### AG-UI (Agent–User Interaction)

**What it is:** A bi-directional, standardized protocol connecting any agentic backend to a user-facing application. Prevents ecosystem fragmentation while enabling broad framework adoption.

**Six core capabilities:**
1. **Shared State** — bi-directional sync of agent and app state (read/write or read-only)
2. **Tool-Based GenUI** — generative UI delivered through tools
3. **Subgraphs** — agent workflow organization
4. **Agentic Chat** — interactive conversation with agents
5. **Human in the Loop** — user oversight and control mechanisms
6. **Agentic GenUI & Predictive Updates** — dynamic UI generation and proactive state changes

**Framework support:** Google ADK, Microsoft Agent Framework, AWS Strands, LangGraph, Mastra, Pydantic AI, Vercel AI SDK, CrewAI, and more.  
**Clients:** React + Angular (CopilotKit); community: Golang, Rust, Java.

Landing page: https://www.copilotkit.ai/ag-ui

---

### A2UI (Agent-to-User Interface)

**What it is:** An open-source declarative JSON format describing UI intent — agents generate component descriptions, clients render them natively using pre-approved widget catalogs.

**Current version:** v0.8 (Public Preview) · v0.9 draft adds `createSurface` and client-side functions.

**Core principles:**
- **Security** — declarative, not executable. Agents can only request components from an approved catalog, preventing UI injection attacks.
- **LLM-Friendly** — flat list with ID references; supports progressive/streaming rendering; agents don't need perfect JSON syntax upfront.
- **Framework-Agnostic** — one JSON payload renders across Angular, Flutter, React, Web Components, SwiftUI, native mobile.
- **Incremental Updates** — flat component list with ID refs lets the LLM update interfaces as conversations evolve.

**Interaction flow:**
1. User messages → 2. Agent generates A2UI JSON → 3. Message streams to client → 4. Client renders natively → 5. User interacts → 6. Agent responds

**Transport protocols:** A2A (Agent-to-Agent), AG-UI, REST (under development)

**Integrations:** Flutter GenUI SDK, CopilotKit/AG-UI (day-zero), Google Opal, Gemini Enterprise

**Quick demo:**
```bash
git clone https://github.com/google/A2UI.git
export GEMINI_API_KEY="your_key"
cd A2UI/samples/client/lit && npm run demo:restaurant
```

**Resources:**
- GitHub: https://github.com/google/a2ui
- Docs + Composer: https://a2ui.org/
- Custom catalog: https://a2ui-composer.ag-ui.com/custom-catalog
- Google blog: https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/

---

## Development Resources

| Resource | URL |
|---|---|
| Starter Kit repo | https://github.com/jerelvelarde/Generative-UI-Global-Hackathon-Starter-Kit |
| CopilotKit docs | https://docs.copilotkit.ai |
| AG-UI landing | https://www.copilotkit.ai/ag-ui |
| A2UI site | https://a2ui.org/ |
| A2UI GitHub | https://github.com/google/a2ui |
| A2UI Composer (visual) | https://a2ui-composer.ag-ui.com/ |
| Google AI Studio (Gemini keys) | https://aistudio.google.com |
| Deep Agents docs | https://docs.langchain.com/oss/python/deepagents/overview |
| mcp-use / Manufact | https://manufact.com/mcp-use |
| Daytona | https://github.com/daytonaio/daytona |
| MCP protocol | https://modelcontextprotocol.io |
| CopilotKit Coding Agents | https://docs.copilotkit.ai/coding-agents |
| Open Generative UI demo | https://opengenerativeui.copilotkit.ai/ |
| Generative UI spectrum talk | https://www.youtube.com/watch?v=y4lln0yGMSE |

### CopilotKit MCP Server (live docs for your coding agent)
**Endpoint:** `https://mcp.copilotkit.ai/mcp`

Add to Claude Code, Cursor, ChatGPT, or any coding agent for live CopilotKit reference access.

### Vibe Coding Skills (pre-installed in starter kit)
Skills for Cursor, Claude Code, and any agent reading `.agent/`:
- **CopilotKit (8):** `copilotkit-{setup,develop,integrations,debug,upgrade,contribute,agui,self-update}`
- **MCP (3):** `mcp-builder`, `mcp-apps-builder`, `chatgpt-app-builder`

Update to latest: `npx skills add copilotkit/skills --full-depth -y`
