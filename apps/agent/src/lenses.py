"""Lens presets for the PR review agent.

Mirror of `apps/frontend/src/lib/review/lenses.ts` (TypeScript) — keep the
two in sync. The frontend declares the lens IDs and surface labels; the
agent uses the same IDs but appends fuller scoring instructions for the
Gemini 3 Pro pass.

Three presets are designed to disagree on a typical PR — each lens picks
a different file as #1. Custom lenses (v1.5) compile down to the same
shape via `compile_lens_from_text()`.
"""

from __future__ import annotations

from typing import Literal, TypedDict


LensId = Literal["money", "architecture", "tests", "custom"]


class Lens(TypedDict):
    id: str
    name: str
    instruction: str
    boost_keywords: list[str]


LENS_PRESETS: list[Lens] = [
    {
        "id": "money",
        "name": "Money / Risk",
        "instruction": (
            "You are reviewing a PR through the MONEY / RISK lens. Treat any "
            "change that affects money handling, billing, transactions, fees, "
            "refunds, money-typed fields, auth, sessions, or PII as the "
            "highest importance. Surface anything that could cause financial "
            "loss, compliance exposure, or unauthorized access. Subtle "
            "rounding changes, off-by-one in fee calculations, branches that "
            "skip the audited charge path, and any new write-path against a "
            "money-bearing field deserve top scores even if they look small. "
            "Tests, refactors, docs, and pure-internal helpers should score "
            "low unless they touch money paths."
        ),
        "boost_keywords": [
            "billing", "payment", "charge", "refund", "transaction",
            "amount", "price", "currency", "auth", "session", "token",
            "pii", "ssn",
        ],
    },
    {
        "id": "architecture",
        "name": "Architecture",
        "instruction": (
            "You are reviewing a PR through the ARCHITECTURE lens. Treat "
            "changes to public APIs, exported types, cross-module imports, "
            "shared interfaces, database schemas, and dependency boundaries "
            "as the highest importance. Surface anything that increases "
            "coupling, breaks contracts other code depends on, or widens "
            "the public surface of a module. Internal-only refactors that "
            "preserve the public surface should score lower; tests and docs "
            "score low unless they reveal an architectural concern."
        ),
        "boost_keywords": [
            "export", "interface", "type", "api", "schema", "migration",
            "contract", "import", "module",
        ],
    },
    {
        "id": "tests",
        "name": "Tests / Quality",
        "instruction": (
            "You are reviewing a PR through the TESTS / QUALITY lens. Treat "
            "removed tests, weakened assertions, missing coverage on new "
            "code paths, and gaps in error handling as the highest "
            "importance. Surface anything that reduces the team's ability "
            "to catch regressions: silently dropped edge cases, "
            "permissive try/catch, equality checks loosened to .toBe-on-"
            "single-field, removed property tests. New code paths without "
            "co-located tests deserve a mid-to-high score even when the "
            "code itself looks fine."
        ),
        "boost_keywords": [
            "test", "spec", "assert", "expect", "throw", "catch", "error",
            "edge", "coverage",
        ],
    },
]

DEFAULT_LENS_ID: LensId = "architecture"


def get_lens(lens_id: str) -> Lens | None:
    for lens in LENS_PRESETS:
        if lens["id"] == lens_id:
            return lens
    return None


def lens_by_id_or_default(lens_id: str | None) -> Lens:
    if lens_id:
        found = get_lens(lens_id)
        if found:
            return found
    fallback = get_lens(DEFAULT_LENS_ID)
    assert fallback is not None
    return fallback
