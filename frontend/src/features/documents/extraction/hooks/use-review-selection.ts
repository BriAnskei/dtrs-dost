import { useMemo, useState } from "react";
import { isFlagged } from "../helpers/mock-helpers";
import type { FieldKey, ResultRow } from "../types/mock-types";

/** Selected field + keyboard / "next flagged" navigation for the review step. */
export function useReviewSelection(rows: ResultRow[]) {
  const flagged = useMemo(() => rows.filter(isFlagged).map((r) => r.field), [rows]);
  // Start where the reviewer is needed: first flagged field, else the first row.
  const [selected, setSelected] = useState<FieldKey | null>(
    flagged[0] ?? rows[0]?.field ?? null,
  );

  const move = (delta: 1 | -1) => {
    if (rows.length === 0) return;
    const i = rows.findIndex((r) => r.field === selected);
    setSelected(rows[(i + delta + rows.length) % rows.length].field);
  };

  const nextFlagged = () => {
    if (flagged.length === 0) return;
    const i = selected ? flagged.indexOf(selected) : -1;
    setSelected(flagged[(i + 1) % flagged.length]);
  };

  return {
    selected,
    select: setSelected,
    move,
    nextFlagged,
    flaggedCount: flagged.length,
  };
}
