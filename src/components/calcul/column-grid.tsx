import { cn } from "~/lib/cn";
import type { OperationLayout } from "~/lib/operations";

/**
 * On-screen posed operation — the same geometry as the printed A5 sheet
 * (both consume layoutOperation, eng-review decision 3A).
 *
 * "Écriture libre" mode (eng-review T3-C): every digit the child writes is
 * inked immediately, like a pencil — the grid NEVER judges a digit (no gray
 * gate, no red, no message). Verification happens by comparison: at the end
 * of the operation the same grid is rendered in `solution` variant next to
 * the child's, and the child compares line by line.
 *
 * Cells are tap-to-select (large touch targets); digits come from the soft
 * numpad. Carry cells are optional scratch space, exactly like the little
 * pencil "1" on paper.
 */

export interface GridEntries {
  /** One entry per numeric column, left to right. null = still empty. */
  result: (string | null)[];
  carries: (string | null)[];
}

export function emptyEntries(layout: OperationLayout): GridEntries {
  return {
    result: layout.expectedDigits.map(() => null),
    carries: layout.carrySlots.map(() => null),
  };
}

export type CellRef =
  | { row: "result"; col: number }
  | { row: "carry"; col: number };

export function ColumnGrid({
  layout,
  entries,
  selected,
  onSelect,
  variant,
}: {
  layout: OperationLayout;
  entries?: GridEntries;
  selected?: CellRef | null;
  onSelect?: (cell: CellRef) => void;
  variant: "libre" | "solution";
}) {
  const isSolution = variant === "solution";
  const cellBase =
    "flex size-12 items-center justify-center rounded-xl text-2xl sm:size-14 sm:text-3xl";
  const isSelected = (cell: CellRef) =>
    selected != null && selected.row === cell.row && selected.col === cell.col;

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center gap-1 rounded-3xl border bg-card p-5",
        isSolution && "opacity-80",
      )}
    >
      {/* Carry scratch row — small, optional, never required. */}
      <div className="flex gap-1.5">
        <span className="size-12 sm:size-14" aria-hidden="true" />
        {layout.carrySlots.map((slot, col) => (
          <span
            className="flex size-12 items-start justify-center sm:size-14"
            key={`carry-${col}-${layout.expectedDigits.length}`}
          >
            {slot && !isSolution ? (
              // Touch target ≥ 44px for small fingers (p-2 hit slop around
              // the small visual box, negative margin keeps the layout).
              <button
                className="-m-2 p-2"
                onClick={() => onSelect?.({ row: "carry", col })}
                type="button"
              >
                <span
                  className={cn(
                    "flex h-6 w-8 items-center justify-center rounded-lg border border-muted-foreground/30 border-dashed text-muted-foreground text-sm",
                    isSelected({ row: "carry", col }) &&
                      "border-2 border-primary border-solid",
                  )}
                >
                  {entries?.carries[col] ?? ""}
                </span>
              </button>
            ) : null}
          </span>
        ))}
      </div>

      {/* Operand rows — printed ink, nothing to touch. */}
      <div className="flex gap-1.5">
        <span className={cellBase} aria-hidden="true" />
        {layout.operandRows[0].map((digit, col) => (
          <span className={cellBase} key={`a-${col}-${digit}`}>
            {digit}
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <span className={cn(cellBase, "text-muted-foreground")}>
          {layout.sign}
        </span>
        {layout.operandRows[1].map((digit, col) => (
          <span className={cellBase} key={`b-${col}-${digit}`}>
            {digit}
          </span>
        ))}
      </div>

      <div className="my-1 h-0.5 w-full rounded bg-foreground/60" />

      {/* Result row — the child's line (or the solution's, muted). */}
      <div className="flex gap-1.5">
        <span className={cellBase} aria-hidden="true" />
        {layout.expectedDigits.map((expectedDigit, col) =>
          isSolution ? (
            <span
              className={cn(cellBase, "text-muted-foreground")}
              key={`sol-${col}-${expectedDigit}`}
            >
              {expectedDigit}
            </span>
          ) : (
            <button
              className={cn(
                cellBase,
                "border border-muted-foreground/40 focus-visible:outline-2 focus-visible:outline-primary/60",
                isSelected({ row: "result", col }) &&
                  "border-2 border-primary bg-primary/5",
              )}
              key={`res-${col}-${expectedDigit}`}
              onClick={() => onSelect?.({ row: "result", col })}
              type="button"
            >
              {entries?.result[col] ?? ""}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
