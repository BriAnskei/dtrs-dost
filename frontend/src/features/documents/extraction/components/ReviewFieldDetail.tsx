import { FIELD_LABELS } from "../constans";
import type { ChunkLocation, ResultRow } from "../types/mock-types";

const pct = (v: number | null) => (v === null ? "—" : `${v}%`);

export default function ReviewFieldDetail({
  row,
  location,
}: {
  row: ResultRow;
  location?: ChunkLocation;
}) {
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
            {location
              ? `Page ${location.page} · ${row.chunkId}`
              : "No location available"}{" "}
            · AI {pct(row.aiConfidence)} × Source {pct(row.sourceConfidence)} ={" "}
            <span className="font-semibold">{pct(row.effectiveConfidence)}</span>
          </p>
          {location && (
            <p className="mt-1.5 line-clamp-2 border-l-2 border-accent pl-2 text-theme-xs italic text-gray-700 dark:text-gray-300">
              {location.text}
            </p>
          )}
        </>
      )}
    </div>
  );
}
