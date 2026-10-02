import { useEffect, useState } from "react";
import { WIZARD_STEPS } from "../constans";
import { useExtraction } from "../hooks/use-extraction";
import type { DocumentDirection } from "../types/mock-types";
import DocumentTypeSelector from "./DocumentTypeSelelector";
import ExtractionConsole from "./ExtractionConsole";
import PdfDropzone from "./PDFDropzone";
import ReviewSplitView from "./ReviewSplitView";
import WizardStepper from "./WizardStepper";

const primaryBtn =
  "px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary";
const secondaryBtn =
  "px-4 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-secondary/40 transition dark:border-white/8 dark:bg-white/3 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed";

export default function DirectUploadPanel() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<DocumentDirection>("incoming");
  const [file, setFile] = useState<File | null>(null);
  const { phase, logs, outcome, start, reset, isRunning } = useExtraction(direction);

  // Auto-advance to Review once extraction finishes. The short delay lets the
  // user see the final "Completed" log line before the view changes.
  useEffect(() => {
    if (step !== 2 || phase !== "done") return;
    const t = window.setTimeout(() => setStep(3), 900);
    return () => window.clearTimeout(t);
  }, [step, phase]);

  const goTo = (i: number) => {
    if (isRunning) return;
    if (i <= 1) reset(); // going back before extraction discards its result
    setStep(i);
  };

  const startOver = () => {
    reset();
    setFile(null);
    setStep(0);
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
          <ReviewSplitView file={file} outcome={outcome} />
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
            onClick={() => {
              if (!file) return;
              setStep(2);
              start(file);
            }}
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
          // MOCK: wire these to real actions later
          <button type="button" className={primaryBtn} onClick={() => {}}>
            {outcome.decision === "ACCEPT"
              ? outcome.assignedDivision
                ? "Confirm & Route"
                : "Save Document"
              : outcome.decision === "REVIEW"
                ? "Send to Human Review"
                : "Re-upload Document"}
          </button>
        )}
      </div>
    </div>
  );
}
