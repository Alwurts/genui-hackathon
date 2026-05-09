import type { DiffHunk, PerHunkScore } from "@/lib/review/types";
import { scoreBucket } from "@/lib/review/state";

interface Props {
  file: string;
  hunk: DiffHunk;
  score: PerHunkScore | null;
  expanded: boolean;
  selected: boolean;
  onToggle: () => void;
  onSelect: () => void;
}

const BUCKET_BADGE: Record<"high" | "med" | "low", string> = {
  high: "bg-rose-100 text-rose-700 border-rose-200",
  med: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

export function HunkCard({
  file,
  hunk,
  score,
  expanded,
  selected,
  onToggle,
  onSelect,
}: Props) {
  const bucket = score ? scoreBucket(score.score) : "low";
  return (
    <article
      className={
        "rounded-lg border bg-card transition " +
        (selected ? "border-foreground" : "border-border")
      }
    >
      <header className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="text-xs text-muted-foreground hover:text-foreground"
          aria-label={expanded ? "Collapse hunk" : "Expand hunk"}
        >
          {expanded ? "▾" : "▸"}
        </button>
        <span className="truncate font-mono text-xs">{file}</span>
        <span className="truncate font-mono text-xs text-muted-foreground">
          {hunk.header}
        </span>
        <span
          className={`ml-auto shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] ${BUCKET_BADGE[bucket]}`}
        >
          {score ? score.score.toFixed(1) : "—"}
        </span>
        <button
          type="button"
          onClick={onSelect}
          className="shrink-0 rounded border border-border px-2 py-0.5 text-[10px] hover:border-foreground"
        >
          Drill in
        </button>
      </header>
      {score && (
        <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          {score.reasons}
          {score.tags.length > 0 && (
            <span className="ml-2">
              {score.tags.map((t) => (
                <span
                  key={t}
                  className="mr-1 rounded bg-muted px-1 py-0.5 font-mono text-[10px]"
                >
                  {t}
                </span>
              ))}
            </span>
          )}
        </p>
      )}
      {expanded && (
        <pre className="overflow-x-auto border-t border-border bg-muted/30 px-3 py-2 font-mono text-[11px] leading-snug">
          {hunk.lines.map((l, i) => (
            <div
              key={i}
              className={
                l.type === "+"
                  ? "bg-emerald-50 text-emerald-900"
                  : l.type === "-"
                    ? "bg-rose-50 text-rose-900"
                    : "text-muted-foreground"
              }
            >
              <span className="select-none pr-2 text-muted-foreground">
                {l.type}
              </span>
              {l.content}
            </div>
          ))}
        </pre>
      )}
    </article>
  );
}
