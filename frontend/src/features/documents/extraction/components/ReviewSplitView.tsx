import { useMemo, useState } from "react";
import { FIELD_LABELS } from "../constans";
import { isFlagged } from "../helpers/extraction-helpers";
import { useReviewSelection } from "../hooks/use-review-selection";
import type {
  ChunkLocation,
  ExtractionOutcome,
  FieldKey,
} from "../types/extraction-types";
import DecisionBanner from "./DecisionBanner";
import PdfViewer, { type PdfHighlight } from "./PdfViewer";
import ReviewFieldDetail from "./ReviewFieldDetail";
import ReviewFieldList from "./ReviewFieldList";

/**
 * Review step: PDF on the left, extracted fields on the right. Selecting a field
 * scrolls to and highlights its source; clicking a highlight selects its field.
 * Below `lg` the two panes become tabs.
 *
 * Chunk locations are built from client-side source extraction (see
 * use-extraction.ts -> extractPdf) and normalized to 0-1 top-left by the
 * extractors in extraction/pdf/*. The LLM only returns chunkId.
 *
 * ── CHUNK GRANULARITY (research notes) ─────────────────────────────────────────
 * Problem: if a chunk is the whole page, the highlight covers the whole page and
 * tells the reviewer nothing. Recommended: LINE-level chunks.
 *  - Native text: pdf.js getTextContent() items carry a transform (x/y origin in PDF
 *    points, bottom-left origin) plus width/height. Group items that share a
 *    baseline into one line chunk (e.g. p2-t5), union their boxes, then normalize:
 *    x/pageW, 1 - (y+h)/pageH (flip Y: PDF origin is bottom-left, screen top-left).
 *  - OCR: Tesseract.js returns blocks -> paragraphs -> lines -> words, each with a
 *    pixel bbox. Use LINES as chunks (e.g. p1-o4) and divide by the rendered image
 *    size to normalize. A paragraph box is just the union of its line boxes.
 *  - Multi-line values (subject that wraps, summary): let the LLM return
 *    `chunkIds: string[]` and highlight each line, or merge adjacent lines into a
 *    paragraph chunk when the gap is under ~0.5 line height. A single-line chunk
 *    that only partly contains the value is fine: the matched-text strip under the
 *    field shows the exact chunk text for verification.
 *  - Keep bboxes OUT of the LLM payload: send {chunkId, text} only and join the
 *    returned chunkId against the client-side location map.
 *  - Word-level boxes are possible later (PDF text only) if the exact value must be
 *    highlighted inside a line.
 * ───────────────────────────────────────────────────────────────────────────────
 */
const tabBtn = (active: boolean) =>
  `flex-1 px-3 py-2 text-theme-sm rounded-lg border transition ${
    active
      ? "border-secondary bg-secondary/5 font-medium text-secondary"
      : "border-gray-200 text-gray-600 dark:border-white/8 dark:text-gray-300"
  }`;

export default function ReviewSplitView({
  file,
  outcome,
}: {
  file: File;
  outcome: ExtractionOutcome;
}) {
  const { selected, select, move, nextFlagged, flaggedCount } = useReviewSelection(
    outcome.rows,
  );
  const [tab, setTab] = useState<"fields" | "document">("fields");

  const handleSelect = (f: FieldKey) => {
    select(f);
    if (!window.matchMedia("(min-width: 1024px)").matches) setTab("document");
  };

  const highlights = useMemo<PdfHighlight[]>(
    () =>
      outcome.rows.flatMap((r) =>
        r.highlights.map((h, i) => ({
          id: `${r.field}:${i}`, // unique React key
          field: r.field,
          page: h.page,
          bbox: h.bbox,
          label: FIELD_LABELS[r.field],
          state: (r.field === selected
            ? "selected"
            : isFlagged(r)
              ? "flagged"
              : "normal") as PdfHighlight["state"],
        })),
      ),
    [outcome, selected],
  );

  const selectedRow = outcome.rows.find((r) => r.field === selected);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 lg:hidden" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "fields"}
          className={tabBtn(tab === "fields")}
          onClick={() => setTab("fields")}
        >
          Fields
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "document"}
          className={tabBtn(tab === "document")}
          onClick={() => setTab("document")}
        >
          Document
        </button>
      </div>

      <div className="grid h-136 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Kept mounted (just hidden) so the PDF isn't reloaded when switching tabs */}
        <div className={`${tab === "document" ? "block" : "hidden"} min-h-0 lg:block`}>
          <PdfViewer
            file={file}
            highlights={highlights}
            selectedId={selected}
            onHighlightClick={(id) => select(id as FieldKey)}
          />
        </div>

        <div
          className={`${tab === "fields" ? "flex" : "hidden"} min-h-0 flex-col gap-3 lg:flex`}
        >
          <DecisionBanner
            decision={outcome.decision}
            minEffective={outcome.minEffective}
            assignedDivision={outcome.assignedDivision}
          />
          <ReviewFieldList
            rows={outcome.rows}
            selected={selected}
            onSelect={handleSelect}
            onMove={move}
            onNextFlagged={nextFlagged}
            flaggedCount={flaggedCount}
          />
          {selectedRow && (
            <ReviewFieldDetail
              row={selectedRow}
              locations={selectedRow.chunkIds
                .map((id) => outcome.chunkLocations[id])
                .filter((l): l is ChunkLocation => Boolean(l))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
