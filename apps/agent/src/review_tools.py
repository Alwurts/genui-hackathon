"""Backend tools that drive the canvas via server-authoritative state.

Each tool returns a `Command(update=...)` so the LangGraph state schema
defined in `ReviewStateMiddleware` is mutated server-side. The
CopilotKitMiddleware then emits STATE_SNAPSHOT with the updated state,
the AG-UI client receives it, and the canvas paints.

This avoids the lost-update problem of using only frontend tools: client
side `agent.setState` is wiped the moment the next STATE_SNAPSHOT
arrives because server state never had those keys.
"""

from __future__ import annotations

from typing import Annotated, Any

from langchain_core.tools import InjectedToolCallId, tool
from langchain_core.messages import ToolMessage
from langgraph.types import Command

from .demo_data import DEMO_PR, DEMO_DIFF
from .lenses import LENS_PRESETS, lens_by_id_or_default


@tool
def load_demo_pr(
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Load the demo PR's metadata + parsed diff into canvas state.

    Use this whenever the user asks you to review the PR / demo PR.
    Updates `pr` and `diff` on the canvas. After this returns, you can
    see the diff in your context — score every hunk under the active
    lens and then call `set_scores` to populate the scores panel.
    """
    return Command(
        update={
            "pr": DEMO_PR,
            "diff": DEMO_DIFF,
            "messages": [
                ToolMessage(
                    content=(
                        f"Loaded {DEMO_PR['title']} "
                        f"({len(DEMO_DIFF['files'])} files, "
                        f"{sum(len(f['hunks']) for f in DEMO_DIFF['files'])} hunks). "
                        "Now score every hunk and call set_scores."
                    ),
                    tool_call_id=tool_call_id,
                )
            ],
        }
    )


@tool
def set_lens(
    lens_id: str,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Set the active review lens.

    Pass one of: 'money', 'architecture', 'tests'. The canvas reflects
    which lens is active and uses it to colour the scoring summary.
    """
    lens = lens_by_id_or_default(lens_id)
    return Command(
        update={
            "lens": dict(lens),
            "messages": [
                ToolMessage(
                    content=f"Lens set to {lens['name']}.",
                    tool_call_id=tool_call_id,
                )
            ],
        }
    )


@tool
def set_scores(
    summary: str,
    perHunk: list[dict[str, Any]],
    perFile: list[dict[str, Any]],
    crossCutting: list[dict[str, Any]],
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Populate the per-hunk scoring panel on the canvas.

    Call this once after you've scored every hunk under the active lens.

    Shapes:
      summary: 1-2 sentence headline of what's worth reading.
      perHunk: list of
        { hunk_id, file, line_start, line_end, score, reasons, tags }
      perFile: list of
        { path, max_score, avg_score, hunk_count }
      crossCutting: list of
        { title, files, why } — at most 3, can be empty.

    score: 0-10. 0-3 trivial; 4-6 secondary; 7-9 important; 10 critical.
    """
    return Command(
        update={
            "scores": {
                "summary": summary,
                "perHunk": perHunk,
                "perFile": perFile,
                "crossCutting": crossCutting,
                "status": "idle",
            },
            "messages": [
                ToolMessage(
                    content=f"Scored {len(perHunk)} hunks across {len(perFile)} files.",
                    tool_call_id=tool_call_id,
                )
            ],
        }
    )


@tool
def list_lenses() -> str:
    """List the available review lenses with id, name, and instruction.

    The `instruction` is your scoring rubric for that lens.
    """
    import json

    return json.dumps(
        [
            {
                "id": lens["id"],
                "name": lens["name"],
                "instruction": lens["instruction"],
            }
            for lens in LENS_PRESETS
        ]
    )


def load_review_tools() -> list[Any]:
    return [load_demo_pr, set_lens, set_scores, list_lenses]
