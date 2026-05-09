import type { AgentState, ReviewUI } from "./types";

export const emptyUI: ReviewUI = {
  selectedHunkId: null,
  expandedFiles: [],
  showLowScoreHunks: false,
};

export const initialState: AgentState = {
  pr: null,
  lens: null,
  scores: null,
  diff: null,
  ui: emptyUI,
};

export const HIGH_SCORE_THRESHOLD = 7;
export const MED_SCORE_THRESHOLD = 4;

export function scoreBucket(score: number): "high" | "med" | "low" {
  if (score >= HIGH_SCORE_THRESHOLD) return "high";
  if (score >= MED_SCORE_THRESHOLD) return "med";
  return "low";
}
