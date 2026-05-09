import type { Lens } from "./types";

export const LENS_PRESETS: Lens[] = [
  {
    id: "money",
    name: "Money / Risk",
    instruction:
      "Treat changes that affect money handling, billing, transactions, fees, refunds, money-typed fields, auth, sessions, or PII as the highest importance. Surface anything that could cause financial loss or compliance exposure.",
    boost_keywords: [
      "billing",
      "payment",
      "charge",
      "refund",
      "transaction",
      "amount",
      "price",
      "currency",
      "auth",
      "session",
      "token",
      "pii",
      "ssn",
    ],
  },
  {
    id: "architecture",
    name: "Architecture",
    instruction:
      "Treat changes to public APIs, exported types, cross-module imports, shared interfaces, and database schemas as the highest importance. Surface anything that increases coupling or breaks contracts other code depends on.",
    boost_keywords: [
      "export",
      "interface",
      "type",
      "api",
      "schema",
      "migration",
      "contract",
      "import",
      "module",
    ],
  },
  {
    id: "tests",
    name: "Tests / Quality",
    instruction:
      "Treat removed tests, weakened assertions, missing coverage on new code paths, and gaps in error handling as the highest importance. Surface anything that reduces the ability to catch regressions.",
    boost_keywords: [
      "test",
      "spec",
      "assert",
      "expect",
      "throw",
      "catch",
      "error",
      "edge",
      "coverage",
    ],
  },
];

export const DEFAULT_LENS_ID: Lens["id"] = "architecture";

export function getLens(id: string): Lens | null {
  return LENS_PRESETS.find((l) => l.id === id) ?? null;
}
