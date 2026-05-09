import type { Lens, ScoringStatus } from "@/lib/review/types";
import { LENS_PRESETS } from "@/lib/review/lenses";

interface Props {
  active: Lens | null;
  status: ScoringStatus;
  onPick: (lens: Lens) => void;
}

export function LensSwitcher({ active, status, onPick }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
        Lens
      </span>
      <div className="flex gap-2">
        {LENS_PRESETS.map((lens) => {
          const isActive = active?.id === lens.id;
          return (
            <button
              key={lens.id}
              type="button"
              onClick={() => onPick(lens)}
              className={
                "rounded-full border px-3 py-1 text-xs transition " +
                (isActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card hover:border-foreground/40")
              }
            >
              {lens.name}
            </button>
          );
        })}
      </div>
      {status === "scoring" && (
        <span className="ml-2 text-xs text-muted-foreground">
          Re-scoring under {active?.name ?? "lens"}…
        </span>
      )}
      {status === "error" && (
        <span className="ml-2 text-xs text-rose-600">Scoring failed</span>
      )}
    </div>
  );
}
