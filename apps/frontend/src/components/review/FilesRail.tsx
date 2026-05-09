import type { PerFileScore } from "@/lib/review/types";
import { scoreBucket } from "@/lib/review/state";

interface Props {
  files: PerFileScore[];
  onPick?: (path: string) => void;
}

const BUCKET_COLOR: Record<"high" | "med" | "low", string> = {
  high: "bg-rose-500",
  med: "bg-amber-400",
  low: "bg-slate-300",
};

export function FilesRail({ files, onPick }: Props) {
  if (!files || files.length === 0) {
    return (
      <aside className="rounded-xl border border-dashed border-border bg-card/40 p-4 text-xs text-muted-foreground">
        No files yet.
      </aside>
    );
  }
  const sorted = [...files].sort((a, b) => b.max_score - a.max_score);
  return (
    <aside className="rounded-xl border border-border bg-card p-3">
      <h2 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
        Files ({sorted.length})
      </h2>
      <ul className="flex flex-col gap-1">
        {sorted.map((f) => {
          const bucket = scoreBucket(f.max_score);
          return (
            <li key={f.path}>
              <button
                type="button"
                onClick={() => onPick?.(f.path)}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted/40"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${BUCKET_COLOR[bucket]}`}
                  aria-hidden
                />
                <span className="truncate font-mono">{f.path}</span>
                <span className="ml-auto shrink-0 font-mono text-muted-foreground">
                  {f.max_score.toFixed(1)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
