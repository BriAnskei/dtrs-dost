import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { WIZARD_STEPS } from "../../constans";
import { useExtraction } from "../../hooks/use-extraction";
import type { DocumentDirection, FieldKey } from "../../types/extraction-types";
import DocumentTypeSelector from "./DocumentTypeSelelector";
import ExtractionConsole from "./ExtractionConsole";
import PdfDropzone from "./PDFDropzone";
import ReviewSplitView from "./ReviewSplitView";
import WizardStepper from "./WizardStepper";

const primaryBtn =
  "px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary";
const secondaryBtn =
  "px-4 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-secondary/40 transition dark:border-white/8 dark:bg-white/3 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed";

const UPLOAD_STEP = 1;

export default function DirectUploadPanel() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<DocumentDirection>("incoming");
  const [file, setFile] = useState<File | null>(null);
  // Reviewer edits, keyed by field. A key is present only if the field was edited.
  const [edits, setEdits] = useState<Partial<Record<FieldKey, string>>>({});
  const { phase, logs, outcome, start, reset, isRunning } = useExtraction(direction);

  // Guards against toasting / navigating if the user left the page mid-extraction.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Auto-advance to Review once extraction finishes. The short delay lets the
  // user see the final "Completed" log line before the view changes.
  useEffect(() => {
    if (step !== 2 || phase !== "done") return;
    const t = window.setTimeout(() => setStep(3), 900);
    return () => window.clearTimeout(t);
  }, [step, phase]);

  const goTo = (i: number) => {
    if (isRunning) return;
    if (i <= 1) {
      reset(); // going back before extraction discards its result
      setEdits({});
    }
    setStep(i);
  };

  const startOver = () => {
    reset();
    setEdits({});
    setFile(null);
    setStep(0);
  };

  const runExtraction = async () => {
    if (!file) return;

    setEdits({});
    setStep(2);
    const result = await start(file);

    if (result.ok || !mountedRef.current) return;

    // Unexpected failure: back to Upload. `file` is untouched, so the dropzone
    // still shows it and the user can retry immediately or swap the file.
    reset();
    setStep(UPLOAD_STEP);

    if (!result.silent) {
      toast.error(result.title, {
        description: result.description,
        id: "extraction-failed",
      });
    }
  };

  /** string = set the edited value, null = revert the field to the extracted value. */
  const handleEdit = (field: FieldKey, value: string | null) =>
    setEdits((prev) => {
      const next = { ...prev };
      if (value === null) delete next[field];
      else next[field] = value;
      return next;
    });

  const handleSave = () => {
    if (!outcome) return;
    const payload = outcome.rows.map((r) => ({
      field: r.field,
      value: r.field in edits ? (edits[r.field] ?? "").trim() : r.value,
      edited: r.field in edits,
    }));
    // TODO: send `payload` (+ file, direction, outcome.assignedDivision) to your save endpoint.
    void payload;
  };

  const meta = WIZARD_STEPS[step];
  const stepStatus =
    step === 3 && outcome
      ? {
          3:
            outcome.decision === "INVALID"
              ? ("error" as const)
              : outcome.decision === "REVIEW"
                ? ("warning" as const)
                : undefined,
        }
      : {};

  return (
    <div className="space-y-6">
      <WizardStepper
        steps={WIZARD_STEPS}
        current={step}
        canNavigate={(i) => !isRunning && i < step}
        onStepClick={goTo}
        status={stepStatus}
      />

      <div className="min-h-80 space-y-4">
        <div>
          <h3 className="text-theme-xl font-semibold text-gray-800 dark:text-white/90">
            {meta.title}
          </h3>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">{meta.hint}</p>
        </div>

        {step === 0 && <DocumentTypeSelector value={direction} onChange={setDirection} />}

        {step === 1 && (
          <PdfDropzone
            file={file}
            onSelect={(f) => {
              reset();
              setFile(f);
            }}
          />
        )}

        {step === 2 && <ExtractionConsole logs={logs} phase={phase} />}

        {step === 3 && outcome && file && (
          <ReviewSplitView
            file={file}
            outcome={outcome}
            edits={edits}
            onEdit={handleEdit}
          />
        )}
      </div>

      {/* Button bar: back on the left, forward action on the right */}
      <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-white/5">
        <div>
          {step === 3 ? (
            <button type="button" className={secondaryBtn} onClick={startOver}>
              Start Over
            </button>
          ) : (
            step > 0 && (
              <button
                type="button"
                className={secondaryBtn}
                disabled={isRunning}
                onClick={() => goTo(step - 1)}
              >
                Back
              </button>
            )
          )}
        </div>

        {step === 0 && (
          <button type="button" className={primaryBtn} onClick={() => setStep(1)}>
            Next
          </button>
        )}
        {step === 1 && (
          <button
            type="button"
            className={primaryBtn}
            disabled={!file}
            onClick={runExtraction}
          >
            Start Extracting
          </button>
        )}
        {step === 2 && (
          <button type="button" className={primaryBtn} disabled>
            {phase === "done" ? "Opening results..." : "Extracting..."}
          </button>
        )}
        {step === 3 && outcome && (
          <button type="button" className={primaryBtn} onClick={handleSave}>
            Save
          </button>
        )}
      </div>
    </div>
  );
}
