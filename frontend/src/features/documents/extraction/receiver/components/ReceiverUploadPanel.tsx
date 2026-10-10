import PdfDropzone from "../../admins/components/PDFDropzone";
import { useReceiverUpload } from "../hooks/use-reciever-upload";
import UploadProcessingCard from "./UploadProcessingCard";
import UploadResultCard from "./UploadResultCard";
import UploadSuccessCard from "./UploadSuccessCard";

const primaryBtn =
  "px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary";
const secondaryBtn =
  "px-4 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-secondary/40 transition dark:border-white/8 dark:bg-white/3 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed";

export default function ReceiverUploadPanel() {
  const {
    file,
    status,
    busy,
    activeIdx,
    result,
    showResult,
    openResult,
    closeResult,
    selectFile,
    submit,
    retryQueue,
    startOver,
  } = useReceiverUpload();

  const viewingResult = status === "queued" && showResult && !!result;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-theme-xl font-semibold text-gray-800 dark:text-white/90">
          {viewingResult ? "Extraction results" : "Upload incoming document"}
        </h3>
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {viewingResult
            ? "Review what was extracted from your document. An admin will verify it before it is added to Incoming Documents."
            : "Upload the PDF. An admin will validate it before it is added to Incoming Documents."}
        </p>
      </div>

      <div className="min-h-56">
        {status === "idle" && <PdfDropzone file={file} onSelect={selectFile} />}

        {file && (busy || status === "queue_failed") && (
          <UploadProcessingCard
            fileName={file.name}
            activeIdx={activeIdx}
            failed={status === "queue_failed"}
          />
        )}

        {/* The success view is replaced by the results view when the user opens it. */}
        {file && status === "queued" && !viewingResult && (
          <UploadSuccessCard
            fileName={file.name}
            onViewResults={result ? openResult : undefined}
          />
        )}

        {file && viewingResult && result && (
          <UploadResultCard fileName={file.name} result={result} />
        )}
      </div>

      {/* Button bar: secondary on the left, forward action on the right */}
      <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-white/5">
        <div>
          {status === "queue_failed" && (
            <button type="button" className={secondaryBtn} onClick={startOver}>
              Start Over
            </button>
          )}
          {viewingResult && (
            <button type="button" className={secondaryBtn} onClick={closeResult}>
              Back
            </button>
          )}
        </div>

        {status === "idle" && (
          <button type="button" className={primaryBtn} disabled={!file} onClick={submit}>
            Submit
          </button>
        )}
        {busy && (
          <button type="button" className={primaryBtn} disabled>
            Processing...
          </button>
        )}
        {status === "queue_failed" && (
          <button type="button" className={primaryBtn} onClick={retryQueue}>
            Retry
          </button>
        )}
        {status === "queued" && (
          <button type="button" className={primaryBtn} onClick={startOver}>
            Upload Another
          </button>
        )}
      </div>
    </div>
  );
}
