import { useCallback, useRef, useState } from "react";
import {
  getApiErrorMessage,
  getErrorStatus,
  isNetworkError,
} from "../../../../../lib/api-error";
import { FIELDS_BY_DIRECTION } from "../../constans";
import { computeEffective, decide } from "../../helpers/extraction-helpers";
import { resolveHighlights, toBBox } from "../../helpers/highlight-helpers";
import type { PdfExtractionResult } from "../../pdf";
import { extractPdf } from "../../pdf";
import type { ExtractionChunk } from "../../pdf/types";
import {
  type ExtractionRequest,
  type ExtractionResponse,
  extractionService,
} from "../../service/extraction-service";
import type {
  ChunkLocation,
  DocumentDirection,
  ExtractionFailure,
  ExtractionOutcome,
  ExtractionPhase,
  ExtractionResult,
  LogEntry,
  LogLevel,
  ResultRow,
} from "../../types/extraction-types";

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

  /**
   * Runs the full pipeline. Never throws: resolves with `{ ok: true }` when an
   * outcome was produced (including INVALID / REVIEW decisions), or with a
   * failure descriptor when something unexpected broke, so the caller can
   * send the user back to the upload step.
   */
  const start = useCallback(
    async (file: File): Promise<ExtractionResult> => {
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

      const fail = (
        logMessage: string,
        failure: ExtractionFailure,
      ): ExtractionFailure => {
        log("error", logMessage);
        setPhase("failed");
        return failure;
      };

      const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

      try {
        /* ── PHASE 1: source extraction (client-side pdf.js + optional OCR) ── */
        setPhase("source");
        log("info", `Loading ${file.name}`);
        log("info", "Parsing PDF with pdf.js…");

        let result: PdfExtractionResult;

        try {
          result = await extractPdf(file);
        } catch (err) {
          return fail(`Source extraction failed: ${errMsg(err)}`, {
            ok: false,
            title: "Could not read this PDF",
            description: "The file may be corrupted or protected. Try another file.",
            silent: false,
          });
        }

        // chunkId -> { page, bbox, text }
        const chunkLocations: Record<string, ChunkLocation> = {};

        // chunkId -> original ExtractionChunk
        // Used later by resolveHighlights() to resolve field values against
        // the original chunk text.
        const chunksById = new Map<string, ExtractionChunk>();

        // chunkId -> source confidence (0-100)
        const chunkSourceConfidence: Record<string, number> = {};

        const allSourceConfidences: number[] = [];
        let totalChunks = 0;

        for (const page of result.pages) {
          for (const chunk of page.content) {
            // Keep every chunk available by ID, including chunks without geometry.
            chunksById.set(chunk.chunkId, chunk);

            // Chunks without geometry cannot be highlighted.
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

        // Nothing readable (blank / unreadable scan): don't waste an LLM call.
        if (totalChunks === 0) {
          return fail("No readable text found in the document.", {
            ok: false,
            title: "No readable text found",
            description: "The PDF appears to be blank or unreadable. Try another file.",
            silent: false,
          });
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
          response = await extractionService.extractFields(request);
        } catch (err) {
          const message = getApiErrorMessage(
            err,
            "The extraction service is unavailable. Please try again.",
          );

          return fail(`LLM request failed: ${message}`, {
            ok: false,
            title: "Extraction failed",
            description: message,
            // The Axios interceptor already toasts network errors and expired sessions.
            silent: isNetworkError(err) || getErrorStatus(err) === 401,
          });
        }

        log("success", "LLM response received");

        /* ── Build rows: join each field's chunkIds -> chunkLocations ── */
        const rows: ResultRow[] = FIELDS_BY_DIRECTION[direction].map((field) => {
          const hit = response.fields.find((f) => f.field === field);

          if (!hit || hit.value === null) {
            return {
              field,
              value: null,
              page: null,
              chunkIds: [],
              highlights: [],
              aiConfidence: null,
              sourceConfidence: null,
              effectiveConfidence: null,
            };
          }

          const chunkIds = (hit.chunkIds ?? []).filter((id) => id in chunkLocations);

          const highlights = resolveHighlights(
            field,
            hit.value,
            chunkIds,
            chunksById,
            chunkLocations,
          );

          // For multi-chunk values, the weakest source line determines
          // the source confidence for the entire extracted field.
          const sources = chunkIds.map((id) => chunkSourceConfidence[id]);
          const sourceConfidence = sources.length ? Math.min(...sources) : null;
          const aiConfidence = hit.aiConfidence;

          return {
            field,
            value: hit.value,
            page: highlights[0]?.page ?? null,
            chunkIds,
            highlights,
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
        return { ok: true };
      } catch (err) {
        // Safety net: anything unexpected (e.g. a bug while building rows)
        // must never leave the wizard stuck on the Extraction step.
        return fail(`Unexpected error: ${errMsg(err)}`, {
          ok: false,
          title: "Something went wrong while extracting",
          description: "Please try again.",
          silent: false,
        });
      }
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
