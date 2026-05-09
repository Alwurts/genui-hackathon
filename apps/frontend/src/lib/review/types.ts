// Canvas types for the lens-driven PR review agent.
// Mirror of `apps/agent/src/review_state.py` (TypedDicts).
// React is the source of truth — agent calls `useFrontendTool` mutators.

export type LensId = "money" | "architecture" | "tests" | "custom";

export interface Lens {
  id: LensId;
  name: string;
  instruction: string;
  boost_keywords: string[];
}

export interface PR {
  url: string;
  title: string;
  author: string;
  base: string;
  head: string;
  files_changed: number;
  additions: number;
  deletions: number;
}

export type DiffLineType = "+" | "-" | " ";

export interface DiffLine {
  type: DiffLineType;
  content: string;
}

export interface DiffHunk {
  hunk_id: string;
  header: string;
  lines: DiffLine[];
}

export interface DiffFile {
  path: string;
  hunks: DiffHunk[];
}

export interface Diff {
  files: DiffFile[];
}

export interface PerFileScore {
  path: string;
  max_score: number;
  avg_score: number;
  hunk_count: number;
}

export interface PerHunkScore {
  hunk_id: string;
  file: string;
  line_start: number;
  line_end: number;
  score: number; // 0..10
  reasons: string;
  tags: string[];
}

export interface CrossCuttingFinding {
  title: string;
  files: string[];
  why: string;
}

export type ScoringStatus = "idle" | "scoring" | "error";

export interface Scores {
  summary: string;
  perFile: PerFileScore[];
  perHunk: PerHunkScore[];
  crossCutting?: CrossCuttingFinding[];
  status: ScoringStatus;
}

export interface ReviewUI {
  selectedHunkId: string | null;
  expandedFiles: string[];
  showLowScoreHunks: boolean;
}

export interface AgentState {
  pr: PR | null;
  lens: Lens | null;
  scores: Scores | null;
  diff: Diff | null;
  ui: ReviewUI;
}
