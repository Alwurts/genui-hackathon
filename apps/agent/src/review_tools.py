"""Backend tools that drive the canvas via server-authoritative state.

Each tool returns a `Command(update=...)` so the LangGraph state schema
defined in `ReviewStateMiddleware` is mutated server-side. The
CopilotKitMiddleware then emits STATE_SNAPSHOT with the updated state,
the AG-UI client receives it, and the canvas paints.

This avoids the lost-update problem of using only frontend tools: client
side `agent.setState` is wiped the moment the next STATE_SNAPSHOT
arrives because server state never had those keys.

Tool surface:
  - load_pr / load_demo_pr — populate the diff (input side)
  - list_lenses          — read-only catalog (analysis aid)
  - submit_review        — single atomic write of the full review
                           (lens + scores). Canvas paints once.
"""

from __future__ import annotations

import json
from typing import Annotated, Any

from langchain_core.tools import InjectedToolCallId, tool
from langchain_core.messages import ToolMessage
from langgraph.types import Command

from .demo_data import DEMO_PR, DEMO_DIFF
from .github_api import GitHubError, fetch_pr, fetch_pr_files
from .lenses import LENS_PRESETS, lens_by_id_or_default


@tool
def load_demo_pr(
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Load the demo PR's metadata + parsed diff into canvas state.

    Use this only when the user explicitly asks for the demo / cached PR.
    Updates `pr` and `diff` on the canvas. After this returns, the diff
    is in your tool result — score every hunk under the chosen lens and
    call `submit_review`.
    """
    payload = {
        "pr": DEMO_PR,
        "diff": DEMO_DIFF,
        "instruction": (
            "Diff is below. Score every hunk_id under the active lens "
            "and call submit_review."
        ),
    }
    return Command(
        update={
            "pr": DEMO_PR,
            "diff": DEMO_DIFF,
            "messages": [
                ToolMessage(
                    content=json.dumps(payload),
                    tool_call_id=tool_call_id,
                )
            ],
        }
    )


@tool
def load_pr(
    url: str,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Fetch a real GitHub PR + its parsed diff and load them onto the canvas.

    Pass a public PR URL like
    `https://github.com/owner/repo/pull/123`. Anonymous reads work for
    public repos (60 req/hr); set GITHUB_PAT to raise the limit.

    Use this whenever the user gives you a PR URL. After this returns,
    the diff is in your tool result — score every hunk under the chosen
    lens and call `submit_review`.
    """
    try:
        pr = fetch_pr(url)
        diff = fetch_pr_files(url)
    except GitHubError as e:
        return Command(
            update={
                "messages": [
                    ToolMessage(
                        content=f"Failed to load PR: {e}",
                        tool_call_id=tool_call_id,
                    )
                ],
            }
        )
    payload = {
        "pr": pr,
        "diff": diff,
        "instruction": (
            "Diff is below. Score every hunk_id under the active lens "
            "and call submit_review."
        ),
    }
    return Command(
        update={
            "pr": pr,
            "diff": diff,
            "messages": [
                ToolMessage(
                    content=json.dumps(payload),
                    tool_call_id=tool_call_id,
                )
            ],
        }
    )


def _per_file_from_per_hunk(
    per_hunk: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Aggregate per-hunk scores into per-file rollups.

    Output shape: { path, max_score, avg_score, hunk_count }, ordered by
    max_score desc so the FilesRail surfaces the worst offenders first.
    """
    by_path: dict[str, list[float]] = {}
    for h in per_hunk:
        path = h.get("file") or ""
        if not path:
            continue
        try:
            score = float(h.get("score", 0))
        except (TypeError, ValueError):
            score = 0.0
        by_path.setdefault(path, []).append(score)

    rows = [
        {
            "path": path,
            "max_score": max(scores),
            "avg_score": sum(scores) / len(scores),
            "hunk_count": len(scores),
        }
        for path, scores in by_path.items()
    ]
    rows.sort(key=lambda r: r["max_score"], reverse=True)
    return rows


@tool
def submit_review(
    lens_id: str,
    summary: str,
    perHunk: list[dict[str, Any]],
    crossCutting: list[dict[str, Any]],
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Submit the final review — lens + scores + summary in one write.

    Call this exactly once per review (after you've loaded the PR and
    scored every hunk). The canvas paints atomically: the lens chip
    flips, the scoring panel populates, and the file rail orders by
    severity, all from the same STATE_SNAPSHOT.

    Args:
      lens_id: Active lens id ('money' | 'architecture' | 'tests').
      summary: 1-2 sentence headline of what's worth reading.
      perHunk: list of
        { hunk_id, file, line_start, line_end, score, reasons, tags }
        — score is 0-10:
          0-3 trivial; 4-6 secondary; 7-9 important; 10 critical.
      crossCutting: up to 3 items spanning 2+ files, shape
        { title, files, why } — empty list is fine.

    perFile is computed server-side from perHunk; you don't need to
    provide it.
    """
    lens = lens_by_id_or_default(lens_id)
    per_file = _per_file_from_per_hunk(perHunk)
    return Command(
        update={
            "lens": dict(lens),
            "scores": {
                "summary": summary,
                "perHunk": perHunk,
                "perFile": per_file,
                "crossCutting": crossCutting,
                "status": "idle",
            },
            "messages": [
                ToolMessage(
                    content=(
                        f"Review submitted under {lens['name']}: "
                        f"{len(perHunk)} hunks scored across "
                        f"{len(per_file)} files."
                    ),
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
    return [load_demo_pr, load_pr, list_lenses, submit_review]
