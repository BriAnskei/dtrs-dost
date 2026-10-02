import { useCallback, useRef, useState } from "react";
import { extractPdf } from "../pdf";
import type { PdfExtractionResult } from "../pdf";
import { computeEffective, decide } from "../helpers/mock-helpers";
import { extractFields } from "../service/extraction-service";
import type { ExtractionRequest, ExtractionResponse } from "../service/extraction-service";
import { FIELDS_BY_DIRECTION } from "../constans";
import type {
  BBox,
  ChunkLocation,
  DocumentDirection,
  ExtractionOutcome,
  ExtractionPhase,
  LogEntry,
  LogLevel,
  ResultRow,
} from "../types/mock-types";

// Maps a pipeline BoundingBox {x,y,width,height} (already normalized 0-1,
// top-left) onto the UI BBox {x,y,w,h} the highlight overlay consumes.
function toBBox(b: { x: number; y: number; width: number; height: number }): BBox {
  return { x: b.x, y: b.y, w: b.width, h: b.height };
}

/**
 * Real extraction driver (Pattern A — chunkId reference).
 *
 * Phase 1 runs entirely in the browser: pdf.js parses the PDF, native text is
 * grouped into line-level chunks (with normalized 0-1 top-left bboxes) and
 * scanned pages are OCR'd with Tesseract. This builds the chunkId -> location
 * map AND gathers the plain chunk texts.
 *
 * Phase 2 ships only {chunkId, text} to the backend LLM, which returns each
 * field value paired with the chunkId it came from. The client joins that
 * chunkId back to its location map to produce the highlightable result.
 */
export function useExtraction(direction: DocumentDirection) {
  const [phase, setPhase] = useState<ExtractionPhase>("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [outcome, setOutcome] = useState<ExtractionOutcome | null>(null);
  const logId = useRef(0);

  const reset = useCallback(() => {
    setPhase("idle");
    setLogs([]);
    setOutcome(null);
    logId.current = 0;
  }, []);

  const start = useCallback(
    async (file: File) => {
      reset();
      const log = (level: LogLevel, message: string) =>
        setLogs((l) => [
          ...l,
          {
            id: logId.current++,
            time: new Date().toLocaleTimeString("en-GB"),
            level,
            message,
          },
        ]);

      /* ── PHASE 1: source extraction (client-side pdf.js + optional OCR) ── */
      setPhase("source");
      log("info", `Loading ${file.name}`);
      log("info", "Parsing PDF with pdf.js…");

      let result: PdfExtractionResult;
      try {
        result = await extractPdf(file);
      } catch (err) {
        log(
          "error",
          `Source extraction failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        setPhase("done");
        return;
      }

      // chunkId -> { page, bbox, text } plus the source confidence (0-100) of
      // each chunk, used to compute the effective confidence per field.
      const chunkLocations: Record<string, ChunkLocation> = {};
      const chunkSourceConfidence: Record<string, number> = {};
      const allSourceConfidences: number[] = [];
      let totalChunks = 0;

      for (const page of result.pages) {
        for (const chunk of page.content) {
          // Chunks without geometry (e.g. OCR that yielded no line data) cannot
          // be highlighted — they are still shipped to the LLM as text, but are
          // not added to the location map.
          if (!chunk.bbox) {
            continue;
          }
          chunkLocations[chunk.chunkId] = {
            page: page.page,
            bbox: toBBox(chunk.bbox),
            text: chunk.text,
          };
          const sourceConfidence = Math.round(chunk.confidence * 100);
          chunkSourceConfidence[chunk.chunkId] = sourceConfidence;
          allSourceConfidences.push(sourceConfidence);
          totalChunks++;
        }
      }

      const avgSource =
        allSourceConfidences.length > 0
          ? Math.round(
              allSourceConfidences.reduce((a, b) => a + b, 0) /
                allSourceConfidences.length,
            )
          : 0;

      log(
        "success",
        `Source extraction complete: ${totalChunks} chunks across ${result.totalPages} pages (avg source confidence ${avgSource}%)`,
      );

      /* ── PHASE 2: LLM field extraction (backend) ── */
      setPhase("llm");

      const request: ExtractionRequest = {
        documentType: direction,
        chunks: Object.entries(chunkLocations).map(([chunkId, loc]) => ({
          chunkId,
          text: loc.text,
        })),
      };

      log(
        "info",
        `Sending ${request.chunks.length} chunks to LLM (text only, no coordinates)…`,
      );
      log(
        "info",
        `LLM extracting ${FIELDS_BY_DIRECTION[direction].length} ${direction} fields…`,
      );

      let response: ExtractionResponse;
      try {
        response = await extractFields(request);
      } catch (err) {
        log(
          "error",
          `LLM request failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        setPhase("done");
        return;
      }
      log("success", "LLM response received");

      /* ── Build rows: join each field's chunkId -> chunkLocations ── */
      const rows: ResultRow[] = FIELDS_BY_DIRECTION[direction].map((field) => {
        const hit = response.fields.find((f) => f.field === field);
        if (!hit || hit.value === null) {
          return {
            field,
            value: null,
            page: null,
            chunkId: null,
            aiConfidence: null,
            sourceConfidence: null,
            effectiveConfidence: null,
          };
        }

        const loc = hit.chunkId ? chunkLocations[hit.chunkId] : undefined;
        const sourceConfidence =
          hit.chunkId ? chunkSourceConfidence[hit.chunkId] ?? null : null;
        const aiConfidence = hit.aiConfidence;

        return {
          field,
          value: hit.value,
          page: loc?.page ?? null,
          chunkId: hit.chunkId,
          aiConfidence,
          sourceConfidence,
          effectiveConfidence:
            aiConfidence != null && sourceConfidence != null
              ? computeEffective(aiConfidence, sourceConfidence)
              : null,
        };
      });

      const { decision, minEffective } = decide(rows);
      if (decision === "INVALID") {
        log("error", "Missing required field(s) → INVALID");
      } else if (decision === "REVIEW") {
        log("warn", `Min effective ${minEffective}% below threshold → HUMAN REVIEW`);
      } else {
        log("success", `Min effective ${minEffective}% → ACCEPT`);
      }

      setOutcome({
        chunkLocations,
        rows,
        decision,
        minEffective,
        assignedDivision:
          direction === "incoming" && decision === "ACCEPT"
            ? "Planning and Design Division"
            : null,
      });
      setPhase("done");
    },
    [direction, reset],
  );

  return {
    phase,
    logs,
    outcome,
    start,
    reset,
    isRunning: phase === "source" || phase === "llm",
  };
}
