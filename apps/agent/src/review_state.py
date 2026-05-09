"""ReviewStateMiddleware — declares the PR-review canvas fields on the
agent's TypedDict state schema so they survive STATE_SNAPSHOT round-trips.

Mirrors the role of the upstream `lead_state.py` but without the
fresh-thread hydration: in this app, fresh threads start empty and the
URL submission (or the cached-demo `useEffect`) populates the canvas.

Field shapes match the TypeScript `AgentState` in
`apps/frontend/src/lib/review/types.ts`.
"""

from __future__ import annotations

from typing import Annotated, Any, Optional

from langchain.agents.middleware.types import AgentMiddleware, AgentState
from typing_extensions import NotRequired, TypedDict


class _PR(TypedDict, total=False):
    url: str
    title: str
    author: str
    base: str
    head: str
    files_changed: int
    additions: int
    deletions: int


class _Lens(TypedDict, total=False):
    id: str
    name: str
    instruction: str
    boost_keywords: list[str]


class _DiffLine(TypedDict, total=False):
    type: str  # '+' | '-' | ' '
    content: str


class _DiffHunk(TypedDict, total=False):
    hunk_id: str
    header: str
    lines: list[_DiffLine]


class _DiffFile(TypedDict, total=False):
    path: str
    hunks: list[_DiffHunk]


class _Diff(TypedDict, total=False):
    files: list[_DiffFile]


class _PerHunk(TypedDict, total=False):
    hunk_id: str
    file: str
    line_start: int
    line_end: int
    score: float
    reasons: str
    tags: list[str]


class _PerFile(TypedDict, total=False):
    path: str
    max_score: float
    avg_score: float
    hunk_count: int


class _CrossCutting(TypedDict, total=False):
    title: str
    files: list[str]
    why: str


class _Scores(TypedDict, total=False):
    summary: str
    perFile: list[_PerFile]
    perHunk: list[_PerHunk]
    crossCutting: list[_CrossCutting]
    status: str  # 'idle' | 'scoring' | 'error'


class _ReviewUI(TypedDict, total=False):
    selectedHunkId: Optional[str]
    expandedFiles: list[str]
    showLowScoreHunks: bool


def _replace(_left: Any, right: Any) -> Any:
    """LangGraph reducer — always take the most recent value."""
    return right


class ReviewCanvasState(AgentState):
    """Extended agent state for the lens-driven PR review canvas."""

    pr: NotRequired[Annotated[Optional[_PR], _replace]]
    lens: NotRequired[Annotated[Optional[_Lens], _replace]]
    diff: NotRequired[Annotated[Optional[_Diff], _replace]]
    scores: NotRequired[Annotated[Optional[_Scores], _replace]]
    ui: NotRequired[Annotated[_ReviewUI, _replace]]


class ReviewStateMiddleware(AgentMiddleware[ReviewCanvasState, Any]):  # type: ignore[type-arg]
    """Contributes the review-canvas state schema. No hydration —
    fresh threads stay empty until the user submits a PR URL.
    """

    state_schema = ReviewCanvasState
