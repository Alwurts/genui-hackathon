"""GitHub REST client + unified-diff parser for the review agent.

Direct API path (not MCP) because:
- Tighter tool surface for the LLM (4 functions vs the GitHub MCP server's
  ~30) — fewer wrong-tool-pick failure modes.
- No external process; one fewer thing that can flake on stage.
- Anonymous reads work for public PRs (60 req/hr); a PAT raises the limit
  to 5000/hr and unlocks write actions.

Public functions:
- `parse_pr_url(url)` -> (owner, repo, number)
- `fetch_pr(url)`     -> PR metadata dict (matches frontend `PR` type)
- `fetch_pr_files(...)` -> Diff dict (matches frontend `Diff` type)
- `post_review_comment(...)` -> stub for v1.4 (raises if no PAT)
- `submit_review(...)`       -> stub for v1.4 (raises if no PAT)

The Diff dict shape matches `apps/frontend/src/lib/review/types.ts`:
    Diff = { files: [{ path, hunks: [{ hunk_id, header, lines: [...] }] }] }
so the agent can pass it straight through `setDiff(diff)` without any
shape conversion.
"""

from __future__ import annotations

import os
import re
from typing import Any
from urllib.parse import urlparse

import httpx


GITHUB_API = "https://api.github.com"
USER_AGENT = "genui-hackathon-pr-review/1.0"
MAX_FILES = 150            # cap for safety; bigger PRs get truncated
MAX_HUNK_LINES = 200       # truncate huge hunks before they reach the LLM


class GitHubError(RuntimeError):
    """Raised on bad URL, network failure, or unexpected API response."""


def _headers() -> dict[str, str]:
    h = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": USER_AGENT,
    }
    pat = os.getenv("GITHUB_PAT", "").strip()
    if pat:
        h["Authorization"] = f"Bearer {pat}"
    return h


def parse_pr_url(url: str) -> tuple[str, str, int]:
    """Parse a GitHub PR URL into (owner, repo, number).

    Accepts:
    - https://github.com/owner/repo/pull/123
    - github.com/owner/repo/pull/123
    - owner/repo#123  (compact form for chat-paste convenience)
    """
    s = url.strip()

    # owner/repo#123
    m = re.fullmatch(r"([\w.-]+)/([\w.-]+)#(\d+)", s)
    if m:
        return m.group(1), m.group(2), int(m.group(3))

    if not s.startswith(("http://", "https://")):
        s = "https://" + s
    parsed = urlparse(s)
    if "github.com" not in (parsed.netloc or ""):
        raise GitHubError(f"not a github.com URL: {url!r}")
    parts = [p for p in parsed.path.split("/") if p]
    # ['owner', 'repo', 'pull', '123', ...]
    if len(parts) < 4 or parts[2] != "pull":
        raise GitHubError(f"not a PR URL: {url!r}")
    try:
        return parts[0], parts[1], int(parts[3])
    except ValueError as e:
        raise GitHubError(f"bad PR number in {url!r}: {e}")


def fetch_pr(url: str) -> dict[str, Any]:
    """Fetch PR metadata in the shape the canvas expects.

    Returns a dict matching the frontend `PR` type:
        { url, title, author, base, head, files_changed, additions, deletions }
    """
    owner, repo, number = parse_pr_url(url)
    api = f"{GITHUB_API}/repos/{owner}/{repo}/pulls/{number}"
    with httpx.Client(timeout=20.0, follow_redirects=True) as client:
        r = client.get(api, headers=_headers())
    if r.status_code == 404:
        raise GitHubError(f"PR not found (or private without PAT): {url}")
    if r.status_code == 403 and "rate limit" in r.text.lower():
        raise GitHubError(
            "GitHub rate limit hit. Set GITHUB_PAT in .env to raise the limit."
        )
    if r.status_code >= 400:
        raise GitHubError(f"GitHub API {r.status_code}: {r.text[:200]}")
    j = r.json()
    user = j.get("user") or {}
    return {
        "url": j.get("html_url") or url,
        "title": j.get("title") or "(untitled)",
        "author": user.get("login") or "unknown",
        "base": (j.get("base") or {}).get("ref") or "",
        "head": (j.get("head") or {}).get("ref") or "",
        "files_changed": j.get("changed_files") or 0,
        "additions": j.get("additions") or 0,
        "deletions": j.get("deletions") or 0,
    }


def fetch_pr_files(url: str) -> dict[str, Any]:
    """Fetch the per-file patches and parse them into the canvas Diff shape.

    Returns a dict with one key:
        { "files": [
            { "path": "...",
              "hunks": [
                { "hunk_id": "<file-slug>-<n>",
                  "header": "@@ -42,9 +42,11 @@ ...",
                  "lines": [ {"type": "+|-| ", "content": "..."}, ... ]
                },
              ]
            },
          ]
        }

    Skips binary files (no `patch` field) and lockfile-style generated files
    so they don't blow up the Gemini context.
    """
    owner, repo, number = parse_pr_url(url)
    api = (
        f"{GITHUB_API}/repos/{owner}/{repo}/pulls/{number}/files"
        f"?per_page=100"
    )
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        r = client.get(api, headers=_headers())
    if r.status_code >= 400:
        raise GitHubError(f"GitHub API {r.status_code}: {r.text[:200]}")
    raw_files = r.json()
    if not isinstance(raw_files, list):
        raise GitHubError(f"unexpected response shape from {api}")

    files: list[dict[str, Any]] = []
    for f in raw_files[:MAX_FILES]:
        path = f.get("filename") or ""
        patch = f.get("patch")
        if not patch:
            continue  # binary, image, etc.
        if _is_generated(path):
            continue
        hunks = _parse_patch(path, patch)
        if not hunks:
            continue
        files.append({"path": path, "hunks": hunks})
    return {"files": files}


# -- internal: diff parsing ------------------------------------------------


_GENERATED_PATHS = (
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "Cargo.lock",
    "Pipfile.lock",
    "uv.lock",
    "poetry.lock",
    "go.sum",
    "composer.lock",
    "Gemfile.lock",
)


def _is_generated(path: str) -> bool:
    name = path.rsplit("/", 1)[-1]
    if name in _GENERATED_PATHS:
        return True
    if name.endswith(".min.js") or name.endswith(".min.css"):
        return True
    return False


_HUNK_HEADER_RE = re.compile(r"^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@")


def _slug(path: str) -> str:
    """Stable, short filename slug for hunk_ids, e.g. 'src/cart/pricing.ts'
    -> 'cart-pricing'.
    """
    base = path.rsplit("/", 1)[-1]
    base = re.sub(r"\.[^.]+$", "", base)  # strip extension
    base = re.sub(r"[^a-zA-Z0-9]+", "-", base).strip("-").lower()
    return base or "file"


def _parse_patch(path: str, patch: str) -> list[dict[str, Any]]:
    """Split a unified-diff patch string into our `DiffHunk` shape.

    GitHub's `patch` field looks like a sequence of `@@ ... @@` headers,
    each followed by `+`, `-`, or ` ` lines. We don't rebuild the file —
    just preserve hunk boundaries verbatim for the LLM and the renderer.
    """
    slug = _slug(path)
    hunks: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    counter = 0

    for raw_line in patch.split("\n"):
        if _HUNK_HEADER_RE.match(raw_line):
            counter += 1
            current = {
                "hunk_id": f"{slug}-{counter}",
                "header": raw_line,
                "lines": [],
            }
            hunks.append(current)
            continue
        if current is None:
            # patch began without a header — ignore the prologue
            continue
        if not raw_line:
            current["lines"].append({"type": " ", "content": ""})
            continue
        kind = raw_line[0]
        if kind in ("+", "-", " "):
            current["lines"].append({"type": kind, "content": raw_line[1:]})
        elif kind == "\\":
            # "\ No newline at end of file" — keep as a context line so the
            # diff renders faithfully.
            current["lines"].append({"type": " ", "content": raw_line})
        else:
            # Fallback: treat unknown prefix as context.
            current["lines"].append({"type": " ", "content": raw_line})

    # truncate runaway hunks before the LLM sees them
    for h in hunks:
        if len(h["lines"]) > MAX_HUNK_LINES:
            h["lines"] = h["lines"][:MAX_HUNK_LINES]
            h["lines"].append(
                {
                    "type": " ",
                    "content": f"… (hunk truncated, {len(h['lines'])} lines)",
                }
            )
    return hunks


# -- write actions: stubs for v1.4 -----------------------------------------


def post_review_comment(*_args: Any, **_kwargs: Any) -> None:
    raise GitHubError(
        "post_review_comment is a v1.4 feature; needs GITHUB_PAT and the v1.4 wiring."
    )


def submit_review(*_args: Any, **_kwargs: Any) -> None:
    raise GitHubError(
        "submit_review is a v1.4 feature; needs GITHUB_PAT and the v1.4 wiring."
    )
