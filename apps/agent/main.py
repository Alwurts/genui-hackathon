"""LangGraph entry point for `langgraph dev --port 8133`.

Wires:
- A switchable runtime (Gemini 3 Pro + react | Gemini Flash-Lite + deepagents |
  Gemini Flash-Lite + react | Claude Sonnet 4.6 + react) selected by
  `AGENT_RUNTIME`. Default is `gemini-pro-react` — single-agent design
  where Pro orchestrates the loop AND scores hunks inline. See `src/runtime.py`.
- Review-domain backend tools from `src/review_tools.py` — direct GitHub
  REST (`fetch_pr_tool`, `fetch_pr_files_tool`). Scoring is the agent's
  own reasoning, not a separate tool.
- TimingMiddleware (per-turn wall-time logging — see `src/timing.py`)
- ReviewStateMiddleware + CopilotKitMiddleware for canvas state + AG-UI

Frontend tools (`setPR`, `setDiff`, `setLens`, `setScores`, …) are
declared on the React side via `useFrontendTool` in `src/app/review/page.tsx`.
The runtime forwards those declarations into the agent's tool list at run
time, so we deliberately do NOT register them in Python — adding them
would cause Gemini to reject the request with "Duplicate function
declaration found: <name>".
"""

from __future__ import annotations

import os

from dotenv import load_dotenv

from src.intelligence_cleanup import wipe_orphan_threads
from src.prompts import build_system_prompt
from src.review_tools import load_review_tools
from src.runtime import build_graph


# Load .env early so GEMINI_API_KEY / NOTION_TOKEN / ANTHROPIC_API_KEY are visible.
load_dotenv()


# `langgraph dev` uses an in-memory checkpoint store, so every agent boot
# starts with zero threads in LangGraph but the Intelligence Postgres
# still holds the chat history from the previous run. Without this
# cleanup, the next `getCheckpointByMessage` lookup throws "Message not
# found" and surfaces in the UI as an opaque rxjs stack trace.
# See `src/intelligence_cleanup.py` for the full rationale.
wipe_orphan_threads()


def _format_integration_status() -> str:
    """Boot-time integration status line for the system prompt.

    The review agent talks to GitHub directly via httpx (no MCP), so the
    only "integration health" we report is whether a GITHUB_PAT is set.
    Anonymous reads still work for public PRs; a PAT raises the rate
    limit and unlocks v1.4 write actions.
    """
    has_pat = bool(os.getenv("GITHUB_PAT"))
    line = (
        "GITHUB_PAT set — authenticated reads + write actions enabled."
        if has_pat
        else "no GITHUB_PAT — anonymous public PR reads only "
        "(60 req/hr; comment posting disabled)."
    )
    print(f"[github] {line}", flush=True)
    return line


# Stub-key warnings for the active runtime live closer to the runtime selector.
# The Gemini runtimes still warn here so the message is loud at boot.
_AGENT_RUNTIME = os.getenv("AGENT_RUNTIME", "openai-react")
print(f"[runtime] AGENT_RUNTIME={_AGENT_RUNTIME}", flush=True)

_gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
_openai_key = os.getenv("OPENAI_API_KEY") or ""

_gemini_missing = (
    _AGENT_RUNTIME.startswith("gemini-")
    and (not _gemini_key or _gemini_key.startswith("stub"))
)
_openai_missing = (
    _AGENT_RUNTIME == "openai-react"
    and (not _openai_key or _openai_key.startswith("stub"))
)

if _gemini_missing:
    print(
        "\n  GEMINI_API_KEY is unset or a stub.\n"
        "   The agent will boot but chat will fall back to a noop reply.\n"
        "   Get a key at https://aistudio.google.com → Get API key,\n"
        "   then set GEMINI_API_KEY in .env AND apps/agent/.env.\n",
        flush=True,
    )
if _openai_missing:
    print(
        "\n  OPENAI_API_KEY is unset or a stub.\n"
        "   The agent will boot but chat will fall back to a noop reply.\n"
        "   Set OPENAI_API_KEY in .env AND apps/agent/.env.\n",
        flush=True,
    )


backend_tools = load_review_tools()


_integration_status = _format_integration_status()
SYSTEM_PROMPT = build_system_prompt(_integration_status)


_use_noop = _gemini_missing or _openai_missing
if _use_noop:
    print(
        "\n[runtime] required key missing or stub — using noop fallback graph.\n"
        "          Chat will reply with a setup pointer instead of hanging.\n",
        flush=True,
    )

# Frontend tools are NOT listed here — see module docstring.
graph = build_graph(
    "noop" if _use_noop else _AGENT_RUNTIME,
    tools=backend_tools,
    system_prompt=SYSTEM_PROMPT,
)


def main() -> None:
    """Entry point for `uv run dev` / `python -m agent`.

    `langgraph dev` is the canonical local-dev runner — this just exists to
    satisfy the `[project.scripts] dev = "agent:main"` entry point.
    """
    import subprocess

    subprocess.run(
        ["langgraph", "dev", "--port", "8133"],
        check=True,
    )


if __name__ == "__main__":
    main()
