# Setup — keys, accounts, and what each one unlocks

This project starts standalone (no keys needed) and becomes more capable as
keys are added. v1.0 / v1.1 (cached demo PR + lens switching on the canvas)
needs **nothing**. v1.3+ (real agent runs against real GitHub PRs) needs
the keys below.

## TL;DR

| When you need it | Key | Where to get it | Cost |
|---|---|---|---|
| **v1.3+ — agent + scoring** | `GEMINI_API_KEY` | https://aistudio.google.com → Get API key | free tier OK |
| **v1.4 — post real review comments** | `GITHUB_PAT` | https://github.com/settings/personal-access-tokens/new | free |
| optional — silences the "1 Issue" badge, durable threads | `COPILOTKIT_LICENSE_TOKEN` | `npx @copilotkit/cli@latest init` | free |
| optional — Claude fallback for runtime/scoring | `ANTHROPIC_API_KEY` | https://console.anthropic.com | paid |

> **You can read public PRs without a PAT.** GitHub allows 60 anonymous
> requests/hr per IP, plenty for development. A PAT bumps that to 5000/hr
> and unlocks the write actions (post comment, approve, request_changes)
> that v1.4 needs.

Drop them into **both** `.env` (root) and `apps/agent/.env` (the agent reads
from its own working directory):

```bash
cp .env.example .env
# ... fill in keys ...
cp .env apps/agent/.env
```

## 1. Gemini API key (required)

Used by:
- `apps/agent/src/runtime.py` — Gemini 3.1 Flash-Lite for chat orchestration.
- `apps/agent/src/scoring.py` — Gemini 3 Pro Preview for per-hunk scoring.

Get one at https://aistudio.google.com → "Get API key". Starts with `AIza`.
The free tier handles low-volume hackathon usage comfortably.

## 2. GitHub PAT (optional for v1.3, required for v1.4)

Public-PR reads work without auth. Skip this until you reach the
comment-posting step (v1.4). Used by `apps/agent/src/github_api.py` to:
- `GET /repos/{owner}/{repo}/pulls/{n}` — fetch PR + diff.
- `POST /repos/{owner}/{repo}/pulls/{n}/comments` — inline review comment.
- `POST /repos/{owner}/{repo}/pulls/{n}/reviews` — submit approve / request_changes.

**Fine-grained PAT (recommended).** https://github.com/settings/personal-access-tokens/new:
- Repository access: scope to **one repo** (the demo target — pick a private
  test repo like `Alwurts/demo-shop` so a misfire doesn't post a real
  comment somewhere unintended).
- Permissions:
  - **Contents: Read**
  - **Pull requests: Read and Write**

**Classic PAT (simpler).** https://github.com/settings/tokens/new:
- Public repos read-only → tick `public_repo`.
- Private repos or comment posting → tick `repo`.

## 3. CopilotKit license (optional)

Silences the red "1 Issue" badge bottom-left and enables durable thread
storage in Postgres. Without it, chat works but threads aren't persisted
across reloads.

```bash
npx @copilotkit/cli@latest init
```

Interactive flow — sign in, accept, paste the token into
`COPILOTKIT_LICENSE_TOKEN`.

## 4. Anthropic key (optional fallback)

Only relevant if Gemini 3 Pro Preview rate-limits or destabilises on
event day. Two ways to swap:
- Set `AGENT_RUNTIME=claude-sonnet-4-6-react` (chat-side fallback).
- Edit `apps/agent/src/scoring.py` to point the smart-model client at
  Claude Sonnet 4.6 instead of Gemini 3 Pro.

We don't ship this as the default because the kit's "Gemini-first"
branding aligns with Google DeepMind being the lead sponsor.

## What runs without keys

| Phase | Needs keys? | What you can do |
|---|---|---|
| v1.0 — domain swap | no | `/review` boots, empty canvas |
| v1.1 — cached demo PR | no | lens switch on the hand-crafted PR (current state) |
| v1.2 — UI polish | no | same as v1.1, prettier |
| v1.3 — real agent run | **Gemini only** (PAT optional) | chat-driven PR load + scoring against public PRs |
| v1.4 — real comment | **+ GitHub PAT** | post inline review comments |
| v1.5+ — A2UI summary, custom lens, live paste | (same as v1.3+) | tier-2 components |
| v2 — MCP App drill-in, deployed MCP server | (same as v1.3+) | tier-3 widget |

## Troubleshooting

- **`AIzaTEMP…` placeholder still in the file.** `predev` runs
  `scripts/check-env.sh`, which only flags strings starting with `stub`,
  `<paste`, `<set`, or `replace-with-`. The `TEMP` shorthand bypasses it
  silently. Fix: paste the real key.
- **Agent boots but chat returns "Set GEMINI_API_KEY in agent/.env"**.
  That's the noop fallback runtime triggering. Confirm you copied the key
  into **both** `.env` and `apps/agent/.env`.
- **Pre-flight Notion check fails on `npm run dev`.** Leftover from the
  upstream starter; the GitHub swap removes the check in v1.3. Workaround
  until then: bypass `predev` by running services directly
  (`npm run dev:infra`, `npm run dev:ui`, `npm run dev:bff`,
  `npm run dev:agent`, `npm run dev:mcp`) instead of `npm run dev`.
