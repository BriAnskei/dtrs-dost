import { FIELD_LABELS } from "../constans";
import type { ChunkLocation, ResultRow } from "../types/extraction-types";

const pct = (v: number | null) => (v === null ? "—" : `${v}%`);

export default function ReviewFieldDetail({
  row,
  locations,
}: {
  row: ResultRow;
  locations: ChunkLocation[];
}) {
  // A field can span pages, so show each distinct page once
  const pages = [...new Set(locations.map((l) => l.page))].join(", ");

  return (
    <div className="shrink-0 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/8 dark:bg-white/3">
      <p className="text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {FIELD_LABELS[row.field]} · source
      </p>
      {row.value === null ? (
        <p className="mt-1 text-theme-xs text-danger">
          Not found by the LLM. Scroll the document to look for it manually.
        </p>
      ) : (
        <>
          <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
            {locations.length > 0
              ? `${locations.length > 1 ? "Pages" : "Page"} ${pages} · ${row.chunkIds.join(", ")}`
              : "No location available"}{" "}
            · AI {pct(row.aiConfidence)} × Source {pct(row.sourceConfidence)} ={" "}
            <span className="font-semibold">{pct(row.effectiveConfidence)}</span>
          </p>
          {locations.length > 0 && (
            <p className="mt-1.5 line-clamp-2 border-l-2 border-accent pl-2 text-theme-xs italic text-gray-700 dark:text-gray-300">
              {locations.map((l) => l.text).join(" ")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
