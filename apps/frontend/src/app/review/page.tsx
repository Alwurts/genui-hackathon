"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Toaster, toast } from "sonner";
import {
  CopilotChatConfigurationProvider,
  CopilotSidebar,
  useAgent,
  useConfigureSuggestions,
  useCopilotKit,
  useDefaultRenderTool,
} from "@copilotkit/react-core/v2";
import { ThreadsDrawer } from "@/components/threads-drawer";
import drawerStyles from "@/components/threads-drawer/threads-drawer.module.css";
import { ToolFallbackCard } from "@/components/copilot/ToolFallbackCard";

import type {
  AgentState,
  DiffHunk,
  Lens,
  PerHunkScore,
  ScoringStatus,
} from "@/lib/review/types";
import { initialState, emptyUI } from "@/lib/review/state";
import { LENS_PRESETS } from "@/lib/review/lenses";
import { orderHunksByImportance, shouldExpandHunk } from "@/lib/review/derive";

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

// ---- canvas inner ----------------------------------------------------------

function CanvasInner({ prUrl }: { prUrl: string | null }) {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();

  const reviewMessage = prUrl
    ? `Review ${prUrl} using the Architecture lens.`
    : "Review the demo PR using the Architecture lens.";
  const reviewTitle = prUrl ? "Review this PR" : "Review the demo PR";

  useConfigureSuggestions({
    available: "before-first-message",
    suggestions: [
      { title: reviewTitle, message: reviewMessage },
      {
        title: "Money lens",
        message: "Re-score this PR under the Money / Risk lens.",
      },
      {
        title: "Tests lens",
        message: "Re-score this PR under the Tests / Quality lens.",
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
  //
  // None — canvas state (pr / diff / scores / lens) is owned by the agent's
  // server-side LangGraph state. Backend tools push updates via
  // Command(update=...) and the snapshot flows back via STATE_SNAPSHOT.
  // Frontend tools could not reliably mutate canvas state because every
  // server snapshot would wipe their effect.

  // Fallback renderer — every backend tool call shows up as a small
  // CopilotKit-branded card in the chat sidebar. Without this, tool calls
  // execute silently with no visible activity in chat.
  useDefaultRenderTool({
    render: ({ name, status, result, parameters }) => (
      <ToolFallbackCard
        name={name}
        status={status}
        result={result}
        parameters={parameters}
      />
    ),
  });

  // ---- Local handlers -----------------------------------------------------

  const injectPrompt = useCallback(
    (prompt: string) => {
      if (!agent) return;
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `msg-${Date.now()}`;
      agent.addMessage({ id, role: "user", content: prompt });
      void copilotkit.runAgent({ agent }).catch((error: unknown) => {
        const msg =
          error && typeof error === "object" && "message" in error
            ? String((error as { message: unknown }).message)
            : "Agent run failed.";
        toast.error(msg, { duration: 8000 });
      });
    },
    [agent, copilotkit],
  );

  const handlePickLens = useCallback(
    (lens: Lens) => {
      // Optimistic flip on the lens; ask the agent to re-score.
      updateState((prev) => ({
        ...prev,
        lens,
        scores: prev.scores ? { ...prev.scores, status: "scoring" } : null,
      }));
      injectPrompt(
        `Re-score this PR under the ${lens.name} lens (lens id: ${lens.id}).`,
      );
    },
    [updateState, injectPrompt],
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

  const handleDrillIn = useCallback(
    (file: string, hunk: DiffHunk, score: PerHunkScore | null) => {
      updateState((prev) => ({
        ...prev,
        ui: {
          ...prev.ui,
          selectedHunkId: hunk.hunk_id,
          expandedFiles: prev.ui.expandedFiles.includes(file)
            ? prev.ui.expandedFiles
            : [...prev.ui.expandedFiles, file],
        },
      }));
      const lensName = state.lens?.name ?? "current";
      const scoreLine = score
        ? `currently scored ${score.score.toFixed(1)} (reason: ${score.reasons})`
        : "unscored";
      injectPrompt(
        `Drill into hunk \`${hunk.hunk_id}\` in \`${file}\` (header: \`${hunk.header}\`). It is ${scoreLine} under the ${lensName} lens. In 3-5 sentences, explain which exact lines drive that score, what a reviewer should look for here, and what could go wrong if this isn't carefully reviewed. Reply in chat only — do NOT call any tools.`,
      );
    },
    [updateState, injectPrompt, state.lens],
  );

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
              {prUrl ? (
                <>
                  <p>
                    Ready to review{" "}
                    <span className="break-all font-mono text-foreground">
                      {prUrl}
                    </span>
                    .
                  </p>
                  <p className="mt-2 text-xs">
                    Open the chat sidebar and click{" "}
                    <span className="font-mono">Review this PR</span> — the
                    agent fetches the diff from GitHub, scores every hunk under
                    the chosen lens, and populates this canvas.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Ask the assistant to{" "}
                    <span className="font-mono text-foreground">
                      review the demo PR
                    </span>{" "}
                    in the chat sidebar.
                  </p>
                  <p className="mt-2 text-xs">
                    The agent loads a hand-crafted demo PR, scores every diff
                    hunk under the chosen lens, and populates this canvas via
                    tool calls.
                  </p>
                </>
              )}
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
                        onDrillIn={() => handleDrillIn(file, hunk, score)}
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
  const searchParams = useSearchParams();
  const prUrl = searchParams.get("pr");
  return (
    <div className={drawerStyles.layout}>
      <ThreadsDrawer
        agentId="default"
        threadId={threadId}
        onThreadChange={setThreadId}
      />
      <div className={drawerStyles.mainPanel}>
        <CopilotChatConfigurationProvider agentId="default" threadId={threadId}>
          <CanvasInner prUrl={prUrl} />
        </CopilotChatConfigurationProvider>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <Suspense fallback={null}>
        <HomePage />
      </Suspense>
    </ClientOnly>
  );
}

void LENS_PRESETS;
