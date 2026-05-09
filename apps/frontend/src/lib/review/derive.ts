import type {
  Diff,
  DiffHunk,
  PerHunkScore,
  Scores,
} from "./types";
import { HIGH_SCORE_THRESHOLD } from "./state";

export interface OrderedHunk {
  file: string;
  hunk: DiffHunk;
  score: PerHunkScore | null;
}

// Flatten diff + scores into a single importance-ordered list.
// Hunks without a score (e.g., before the first scoring pass) get score=null
// and sort to the bottom.
export function orderHunksByImportance(
  diff: Diff | null,
  scores: Scores | null
): OrderedHunk[] {
  if (!diff) return [];
  const byId = new Map<string, PerHunkScore>();
  if (scores) {
    for (const s of scores.perHunk) byId.set(s.hunk_id, s);
  }
  const flat: OrderedHunk[] = [];
  for (const f of diff.files) {
    for (const h of f.hunks) {
      flat.push({ file: f.path, hunk: h, score: byId.get(h.hunk_id) ?? null });
    }
  }
  flat.sort((a, b) => {
    const sa = a.score?.score ?? -1;
    const sb = b.score?.score ?? -1;
    return sb - sa;
  });
  return flat;
}

export function shouldExpandHunk(
  score: PerHunkScore | null,
  showLowScoreHunks: boolean
): boolean {
  if (!score) return showLowScoreHunks; // no score yet → respect global toggle
  if (score.score >= HIGH_SCORE_THRESHOLD) return true;
  return showLowScoreHunks;
}
