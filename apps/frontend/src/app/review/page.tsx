"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Toaster } from "sonner";
import {
  CopilotChatConfigurationProvider,
  CopilotSidebar,
  useAgent,
  useConfigureSuggestions,
  useFrontendTool,
} from "@copilotkit/react-core/v2";
import { ThreadsDrawer } from "@/components/threads-drawer";
import drawerStyles from "@/components/threads-drawer/threads-drawer.module.css";

import type {
  AgentState,
  Diff,
  Lens,
  PR,
  Scores,
  ScoringStatus,
} from "@/lib/review/types";
import { initialState, emptyUI } from "@/lib/review/state";
import { LENS_PRESETS, DEFAULT_LENS_ID, getLens } from "@/lib/review/lenses";
import { orderHunksByImportance, shouldExpandHunk } from "@/lib/review/derive";
import { demoPR, demoDiff } from "@/data/demoPR";
import { demoScores } from "@/data/demoScores";

import { PRHeader } from "@/components/review/PRHeader";
import { LensSwitcher } from "@/components/review/LensSwitcher";
import { FilesRail } from "@/components/review/FilesRail";
import { HunkCard } from "@/components/review/HunkCard";

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

function mergeAgentState(raw: unknown): AgentState {
  const partial =
    raw && typeof raw === "object" ? (raw as Partial<AgentState>) : {};
  return {
    ...initialState,
    ...partial,
    ui: { ...emptyUI, ...(partial.ui ?? {}) },
  };
}

// ---- zod schemas mirroring the canvas types --------------------------------

const lensShape = z.object({
  id: z.string(),
  name: z.string(),
  instruction: z.string(),
  boost_keywords: z.array(z.string()),
});

const prShape = z.object({
  url: z.string(),
  title: z.string(),
  author: z.string(),
  base: z.string(),
  head: z.string(),
  files_changed: z.number(),
  additions: z.number(),
  deletions: z.number(),
});

const diffLineShape = z.object({
  type: z.enum(["+", "-", " "]),
  content: z.string(),
});

const diffHunkShape = z.object({
  hunk_id: z.string(),
  header: z.string(),
  lines: z.array(diffLineShape),
});

const diffShape = z.object({
  files: z.array(
    z.object({
      path: z.string(),
      hunks: z.array(diffHunkShape),
    }),
  ),
});

const perFileScoreShape = z.object({
  path: z.string(),
  max_score: z.number(),
  avg_score: z.number(),
  hunk_count: z.number(),
});

const perHunkScoreShape = z.object({
  hunk_id: z.string(),
  file: z.string(),
  line_start: z.number(),
  line_end: z.number(),
  score: z.number(),
  reasons: z.string(),
  tags: z.array(z.string()),
});

const scoresShape = z.object({
  summary: z.string(),
  perFile: z.array(perFileScoreShape),
  perHunk: z.array(perHunkScoreShape),
  crossCutting: z
    .array(
      z.object({
        title: z.string(),
        files: z.array(z.string()),
        why: z.string(),
      }),
    )
    .optional(),
  status: z.enum(["idle", "scoring", "error"]),
});

// ---- canvas inner ----------------------------------------------------------

function CanvasInner() {
  const { agent } = useAgent();

  useConfigureSuggestions({
    available: "before-first-message",
    suggestions: [
      {
        title: "Review a PR",
        message:
          "Review this pull request for me and use the Architecture lens to start.",
      },
      {
        title: "Switch to Money lens",
        message: "Re-score the current PR under the Money / Risk lens.",
      },
      {
        title: "Explain top hunk",
        message: "Drill into the highest-scoring hunk and explain why it matters.",
      },
      {
        title: "Comment on top finding",
        message: "Post a review comment on the top finding for the active lens.",
      },
    ],
  });

  const state = mergeAgentState(agent?.state);

  const updateState = useCallback(
    (updater: (prev: AgentState) => AgentState) => {
      agent?.setState(updater(mergeAgentState(agent?.state)));
    },
    [agent],
  );

  // ---- Frontend tools (agent-callable mutators) ---------------------------

  useFrontendTool({
    name: "setPR",
    description:
      "Replace the loaded PR metadata. Call once after fetching the PR.",
    parameters: z.object({ pr: prShape }),
    handler: async ({ pr }) => {
      updateState((prev) => ({ ...prev, pr: pr as PR }));
      return "PR set";
    },
  });

  useFrontendTool({
    name: "setDiff",
    description:
      "Replace the parsed diff. Call once after fetching PR files.",
    parameters: z.object({ diff: diffShape }),
    handler: async ({ diff }) => {
      updateState((prev) => ({ ...prev, diff: diff as Diff }));
      return "diff set";
    },
  });

  useFrontendTool({
    name: "setLens",
    description:
      "Set the active lens. Pass either a preset id or a fully-formed Lens object. Triggers a re-scoring pass.",
    parameters: z.object({ lens: lensShape }),
    handler: async ({ lens }) => {
      updateState((prev) => ({
        ...prev,
        lens: lens as Lens,
        scores: prev.scores
          ? { ...prev.scores, status: "scoring" }
          : null,
      }));
      return `lens set: ${lens.name}`;
    },
  });

  useFrontendTool({
    name: "setScores",
    description:
      "Replace the entire scores object. Replaces (does not merge) per-hunk scores.",
    parameters: z.object({ scores: scoresShape }),
    handler: async ({ scores }) => {
      updateState((prev) => ({ ...prev, scores: scores as Scores }));
      return `scores set: ${scores.perHunk.length} hunks`;
    },
  });

  useFrontendTool({
    name: "setScoringStatus",
    description:
      "Update only the scoring progress flag without replacing scores.",
    parameters: z.object({ status: z.enum(["idle", "scoring", "error"]) }),
    handler: async ({ status }) => {
      updateState((prev) => ({
        ...prev,
        scores: prev.scores
          ? { ...prev.scores, status: status as ScoringStatus }
          : prev.scores,
      }));
      return `status: ${status}`;
    },
  });

  useFrontendTool({
    name: "setSummary",
    description:
      "Replace the high-level review summary (1–2 sentences from the smart model).",
    parameters: z.object({ summary: z.string() }),
    handler: async ({ summary }) => {
      updateState((prev) => ({
        ...prev,
        scores: prev.scores
          ? { ...prev.scores, summary }
          : prev.scores,
      }));
      return "summary set";
    },
  });

  useFrontendTool({
    name: "selectHunk",
    description:
      "Open the drill-in panel on a specific hunk. Pass null to close.",
    parameters: z.object({ hunkId: z.string().nullable() }),
    handler: async ({ hunkId }) => {
      updateState((prev) => ({
        ...prev,
        ui: { ...prev.ui, selectedHunkId: hunkId },
      }));
      return hunkId ? `selected ${hunkId}` : "drill-in closed";
    },
  });

  useFrontendTool({
    name: "setShowLowScoreHunks",
    description:
      "Toggle whether low-importance hunks are shown expanded or collapsed.",
    parameters: z.object({ show: z.boolean() }),
    handler: async ({ show }) => {
      updateState((prev) => ({
        ...prev,
        ui: { ...prev.ui, showLowScoreHunks: show },
      }));
      return show ? "showing all hunks" : "collapsing low-score hunks";
    },
  });

  // ---- Local handlers (UI verbs) ------------------------------------------

  const handlePickLens = useCallback(
    (lens: Lens) => {
      // Show "scoring…" briefly, then swap in the cached lens scores.
      updateState((prev) => ({
        ...prev,
        lens,
        scores: prev.scores ? { ...prev.scores, status: "scoring" } : null,
      }));
      const cached = demoScores[lens.id as keyof typeof demoScores];
      if (cached) {
        const delay = setTimeout(() => {
          updateState((prev) => ({ ...prev, scores: cached }));
        }, 600);
        return () => clearTimeout(delay);
      }
    },
    [updateState],
  );

  const handleToggleHunk = useCallback(
    (file: string) => {
      updateState((prev) => ({
        ...prev,
        ui: {
          ...prev.ui,
          expandedFiles: prev.ui.expandedFiles.includes(file)
            ? prev.ui.expandedFiles.filter((p) => p !== file)
            : [...prev.ui.expandedFiles, file],
        },
      }));
    },
    [updateState],
  );

  const handleSelectHunk = useCallback(
    (hunkId: string) => {
      updateState((prev) => ({
        ...prev,
        ui: {
          ...prev.ui,
          selectedHunkId: prev.ui.selectedHunkId === hunkId ? null : hunkId,
        },
      }));
    },
    [updateState],
  );

  // ---- Auto-load cached demo PR on first mount ----------------------------
  // v1.1: until the agent is wired, load the hand-crafted PR + default lens
  // scores so the canvas has something to demo. Agent will replace this
  // path in v1.3 by calling the same frontend tools.
  useEffect(() => {
    if (!agent) return;
    if (state.pr) return;
    const defaultLens = getLens(DEFAULT_LENS_ID);
    agent.setState({
      ...initialState,
      pr: demoPR,
      diff: demoDiff,
      lens: defaultLens,
      scores: defaultLens
        ? demoScores[defaultLens.id as keyof typeof demoScores]
        : null,
    });
    // Run once on mount; agent is stable per render after first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent]);

  // ---- Derived view -------------------------------------------------------

  const orderedHunks = useMemo(
    () => orderHunksByImportance(state.diff, state.scores),
    [state.diff, state.scores],
  );

  const status: ScoringStatus = state.scores?.status ?? "idle";

  return (
    <>
      <main className="flex h-screen flex-col gap-4 overflow-hidden bg-background px-6 py-6">
        <PRHeader pr={state.pr} />

        <div className="flex items-center justify-between gap-3">
          <LensSwitcher
            active={state.lens}
            status={status}
            onPick={handlePickLens}
          />
          {state.scores?.summary && (
            <p className="max-w-xl truncate text-xs text-muted-foreground">
              {state.scores.summary}
            </p>
          )}
        </div>

        {!state.pr ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <div className="max-w-md text-sm text-muted-foreground">
              <p>
                Ask the assistant to{" "}
                <span className="font-mono text-foreground">
                  review &lt;pull-request-url&gt;
                </span>{" "}
                to load a PR onto the canvas.
              </p>
              <p className="mt-2 text-xs">
                Then switch lenses to see how the importance ranking shifts
                under different business contexts.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr] gap-4 overflow-hidden">
            <div className="overflow-y-auto">
              <FilesRail files={state.scores?.perFile ?? []} />
            </div>
            <div className="overflow-y-auto pr-1">
              <ul className="flex flex-col gap-2">
                {orderedHunks.map(({ file, hunk, score }) => {
                  const expanded = shouldExpandHunk(
                    score,
                    state.ui.showLowScoreHunks,
                  );
                  return (
                    <li key={hunk.hunk_id}>
                      <HunkCard
                        file={file}
                        hunk={hunk}
                        score={score}
                        expanded={expanded}
                        selected={state.ui.selectedHunkId === hunk.hunk_id}
                        onToggle={() => handleToggleHunk(file)}
                        onSelect={() => handleSelectHunk(hunk.hunk_id)}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </main>

      <CopilotSidebar
        defaultOpen
        width={420}
        input={{ disclaimer: () => null, className: "pb-6" }}
      />

      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            error: "!bg-rose-50 !text-rose-900 !border !border-rose-200",
          },
        }}
      />
    </>
  );
}

function HomePage() {
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  return (
    <div className={drawerStyles.layout}>
      <ThreadsDrawer
        agentId="default"
        threadId={threadId}
        onThreadChange={setThreadId}
      />
      <div className={drawerStyles.mainPanel}>
        <CopilotChatConfigurationProvider agentId="default" threadId={threadId}>
          <CanvasInner />
        </CopilotChatConfigurationProvider>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <HomePage />
    </ClientOnly>
  );
}

// LENS_PRESETS is consumed by LensSwitcher; getLens is consumed in mount effect.
void LENS_PRESETS;
