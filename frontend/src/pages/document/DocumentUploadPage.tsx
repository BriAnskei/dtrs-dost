import { useCallback, useEffect, useState } from "react";
import { pdfjs } from "react-pdf";
import { useLocation, useNavigate } from "react-router";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import * as pdfjsLib from "pdfjs-dist";
import Tesseract from "tesseract.js";
import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import type { InvalidDocument } from "../../components/tables/InvalidDocumentsTable";
import { extractPdf } from "../../module/pdf-extraction";
import DocumentTypeToggle from "./components/DocumentTypeToggle";
import DropZone from "./components/DropZone";
import IncomingExtractionPanel from "./components/IncomingExtractionPanel";
import OutgoingExtractionPanel from "./components/OutgoingExtractionPanel";
import PdfPreviewPanel from "./components/PdfPreviewPanel";
// Types
import type { DocumentType } from "./components/types";
import { useIncomingExtraction } from "./components/useIncomingExtraction";
import { useOutgoingExtraction } from "./components/useOutgoingExtraction";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface LocationState {
  invalidDocument?: InvalidDocument;
  queueDocument?: QueueDocument;
}

interface QueueDocument {
  id: string;
  fileId: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  uploaderName: string;
  createdAt: string;
}

export default function DocumentUploadPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const invalidDocument = (location.state as LocationState | null)?.invalidDocument;
  const queueDocument = (location.state as LocationState | null)?.queueDocument;

  const [docType, setDocType] = useState<DocumentType>("incoming");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [hydrating, setHydrating] = useState(!!invalidDocument || !!queueDocument);
  const [saveError, setSaveError] = useState<string | null>(null);

  const incoming = useIncomingExtraction();
  const outgoing = useOutgoingExtraction();

  // ---------------------------------------------------------------------------
  // PDF text extraction helpers (kept here as they are page‑specific)
  // ---------------------------------------------------------------------------
  const extractPdfText = useCallback(async (file: File) => {
    try {
      const arrBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrBuffer }).promise;
      let text = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(" ");
        text += `\n\n--- PAGE ${pageNum} ---\n${pageText}`;
      }
      return text;
    } catch (error) {
      console.error(error);
    }
  }, []);

  const extractOCR = async (file: File) => {
    try {
      const arrBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrBuffer }).promise;
      let fullText = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) continue;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, canvas, viewport }).promise;
        const image = canvas.toDataURL("image/png");
        const result = await Tesseract.recognize(image, "eng", {
          logger: (m) => console.log(m),
        });
        fullText += `\n\n--- PAGE ${pageNum} ---\n` + result.data.text;
      }
      return fullText;
    } catch (error) {
      console.error("OCR error:", error);
    }
  };

  // ---------------------------------------------------------------------------
  // Hydrate from an invalid document (arrived via "Process Document" in the modal)
  // Skips OCR/extraction entirely — we already have aiResponse from the first pass.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!invalidDocument) return;

    let cancelled = false;

    async function hydrateFromInvalidDocument(doc: InvalidDocument) {
      setDocType("incoming"); // invalid docs only ever come from the incoming flow
      setHydrating(true);
      incoming.setStatus("extracting");

      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
        const fileRes = await fetch(`${apiUrl}${doc.fileUrl}`);
        if (!fileRes.ok) {
          throw new Error(`Failed to fetch document file: ${fileRes.status}`);
        }
        const blob = await fileRes.blob();
        const file = new File([blob], doc.fileName, { type: "application/pdf" });

        if (cancelled) return;
        setUploadedFile(file);

        // Prefill whatever the AI already extracted successfully.
        // missingFields are intentionally left blank for manual entry.
        const ai = doc.aiResponse ?? {};
        incoming.updateField("subject", ai.subject ?? "");
        incoming.updateField("from", ai.from ?? "");
        incoming.updateField("to", ai.to ?? "");
        incoming.updateField("dateReceived", ai.date_received ?? "");

        incoming.setStatus("done");
      } catch (error) {
        console.error("Failed to hydrate from invalid document:", error);
        incoming.setStatus("error");
      } finally {
        if (!cancelled) setHydrating(false);
      }
    }

    hydrateFromInvalidDocument(invalidDocument);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invalidDocument]);

  // ── Hydrate from a queue document (arrived via "Process Document" in the upload queue)
  // Fetches the PDF, extracts text, runs AI extraction, and pre-fills the form.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!queueDocument) return;

    let cancelled = false;

    async function hydrateFromQueueDocument(doc: QueueDocument) {
      setDocType("incoming"); // queue docs only ever come from the incoming flow
      setHydrating(true);
      incoming.setStatus("extracting");

      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

        // Step 1: Fetch the PDF file
        const fileRes = await fetch(`${apiUrl}${doc.fileUrl}`);
        if (!fileRes.ok) {
          throw new Error(`Failed to fetch document file: ${fileRes.status}`);
        }
        const blob = await fileRes.blob();
        const file = new File([blob], doc.fileName, { type: "application/pdf" });

        if (cancelled) return;
        setUploadedFile(file);

        // Step 2: Extract text from PDF
        let text = await extractPdfText(file);

        if (!text || text.trim().length <= 50) {
          text = await extractOCR(file);
        }

        if (cancelled || !text) {
          throw new Error("Failed to extract text from document");
        }

        // Step 3: Call AI extraction endpoint
        const aiRes = await fetch(`${apiUrl}/ai/extract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: text,
            systemInstruction:
              "You are a document extraction assistant. Extract structured metadata from document text. " +
              "Return ONLY a valid JSON object with no markdown, no explanations, no extra text. " +
              "Required fields: subject, from, to, date_received. " +
              "date_received must be in YYYY-MM-DD format. " +
              "If a field cannot be found in the document, return an empty string for that field.",
          }),
        });

        const aiData = await aiRes.json();

        if (cancelled) return;

        if (aiData.success && aiData.res) {
          incoming.setExtractionField(aiData.res);
          incoming.setStatus("done");
        } else {
          throw new Error(aiData.error || "AI extraction failed");
        }
      } catch (error) {
        console.error("Failed to hydrate from queue document:", error);
        incoming.setStatus("error");
      } finally {
        if (!cancelled) setHydrating(false);
      }
    }

    hydrateFromQueueDocument(queueDocument);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueDocument]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleFileDrop = useCallback(
    async (file: File) => {
      // Manual drop is for fresh uploads only — an invalid-document or queue-document
      // session already has its file supplied via hydration above.
      if (invalidDocument || queueDocument) return;

      setUploadedFile(file);
      const res = await extractPdf(file);

      let text = await extractPdfText(file);

      if (!text || text.length <= 50) {
        text = await extractOCR(file);
      }
    },
    [docType, incoming, outgoing, invalidDocument, queueDocument],
  );

  const handleClearFile = useCallback(() => {
    if (invalidDocument || queueDocument) return; // don't allow clearing the source doc mid-fix
    setUploadedFile(null);
    incoming.reset();
    outgoing.reset();
  }, [incoming, outgoing, invalidDocument, queueDocument]);

  const handleTypeChange = useCallback(
    (type: DocumentType) => {
      if (invalidDocument || queueDocument) return; // type is locked to "incoming" in this flow
      setDocType(type);
      setUploadedFile(null);
      incoming.reset();
      outgoing.reset();
    },
    [incoming, outgoing, invalidDocument, queueDocument],
  );

  // Saves the reviewed incoming-document metadata from the upload queue:
  // marks the queue entry as received, creates the incoming_documents record,
  // and creates the document_routing rows for the selected divisions.
  const handleSaveIncomingDocument = useCallback(async () => {
    if (!queueDocument) return;

    setSaveError(null);

    if (!incoming.metadata.routedTo || incoming.metadata.routedTo.length === 0) {
      setSaveError("Please select at least one division under Routed To before saving.");
      return;
    }

    const result = await incoming.save({
      queueId: queueDocument.id,
      documentFileId: queueDocument.fileId,
    });

    if (result.success) {
      navigate("/upload-queue", {
        state: { savedMessage: "Document saved and routed successfully." },
      });
    } else {
      setSaveError(result.message);
    }
  }, [incoming, queueDocument, navigate]);

  // Saves the reviewed incoming-document metadata from the invalid documents
  // flow: deletes the invalid_documents record, creates an incoming_doc_queue
  // entry (status: received), creates the incoming_documents record, and
  // creates the document_routing rows. On success, redirects to /incoming.
  const handleSaveInvalidDocument = useCallback(async () => {
    if (!invalidDocument) return;

    setSaveError(null);

    if (!incoming.metadata.routedTo || incoming.metadata.routedTo.length === 0) {
      setSaveError("Please select at least one division under Routed To before saving.");
      return;
    }

    const result = await incoming.saveInvalid({
      invalidDocId: invalidDocument.id,
      documentFileId: invalidDocument.documentFileId,
    });

    if (result.success) {
      navigate("/incoming", {
        state: { savedMessage: "Document saved and routed successfully." },
      });
    } else {
      setSaveError(result.message);
    }
  }, [incoming, invalidDocument, navigate]);

  return (
    <div>
      <PageMeta
        title="Document Upload | DTRS"
        description="Upload a PDF document to extract and review its metadata."
      />
      <PageBreadcrumb pageTitle="Document Upload" />

      <ComponentCard
        title={
          invalidDocument
            ? "Complete Missing Details"
            : queueDocument
              ? "Process Document"
              : "Upload"
        }
        desc={
          invalidDocument
            ? `Fill in the missing fields for "${invalidDocument.fileName}" before it can be routed.`
            : queueDocument
              ? `Review the AI-extracted metadata for "${queueDocument.fileName}" and make any corrections before routing.`
              : "Upload a PDF to automatically extract its metadata for routing and tracking."
        }
        className="mb-8"
      >
        <DocumentTypeToggle
          value={docType}
          onChange={handleTypeChange}
          disabled={!!invalidDocument || !!queueDocument}
        />
        <div
          className={`mb-6 flex items-center gap-2.5 rounded-xl border px-4 py-3 ${
            docType === "incoming"
              ? "border-primary/20 bg-primary/5 dark:border-primary/20 dark:bg-primary/10"
              : "border-secondary/20 bg-secondary/5 dark:border-secondary/20 dark:bg-secondary/10"
          }`}
        >
          <span
            className={`text-theme-xs font-semibold tracking-widest uppercase ${
              docType === "incoming"
                ? "text-primary dark:text-secondary"
                : "text-secondary dark:text-secondary"
            }`}
          >
            {docType === "incoming" ? "▼ Incoming Document" : "▲ Outgoing Document"}
          </span>
          <span
            className={`text-theme-xs ${
              docType === "incoming"
                ? "text-primary/60 dark:text-secondary/60"
                : "text-secondary/70 dark:text-secondary/60"
            }`}
          >
            {docType === "incoming"
              ? "Documents received by the office"
              : "Documents sent out by the office"}
          </span>
        </div>

        {saveError && (
          <div className="text-theme-sm mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400">
            {saveError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
            {hydrating ? (
              <div className="text-theme-sm flex h-full min-h-[200px] items-center justify-center text-gray-400">
                Loading document…
              </div>
            ) : uploadedFile ? (
              <PdfPreviewPanel
                file={uploadedFile}
                onClear={handleClearFile}
                clearable={!invalidDocument && !queueDocument}
              />
            ) : (
              <DropZone onFileDrop={handleFileDrop} />
            )}
          </div>

          <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
            {docType === "incoming" ? (
              <IncomingExtractionPanel
                status={incoming.status}
                metadata={incoming.metadata}
                hasFile={!!uploadedFile}
                onFieldChange={incoming.updateField}
                onSave={
                  queueDocument
                    ? handleSaveIncomingDocument
                    : invalidDocument
                      ? handleSaveInvalidDocument
                      : undefined
                }
                saving={incoming.saving}
              />
            ) : (
              <OutgoingExtractionPanel
                status={outgoing.status}
                metadata={outgoing.metadata}
                hasFile={!!uploadedFile}
                onFieldChange={outgoing.updateField}
              />
            )}
          </div>
        </div>
      </ComponentCard>
    </div>
  );
}
