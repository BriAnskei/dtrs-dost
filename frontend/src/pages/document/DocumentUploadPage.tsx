import { useCallback, useState } from "react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { extractPdf } from "../../module/pdf-extraction";
import DocumentTypeToggle from "./components/DocumentTypeToggle";
import DropZone from "./components/DropZone";
import IncomingExtractionPanel from "./components/IncomingExtractionPanel";
import OutgoingExtractionPanel from "./components/OutgoingExtractionPanel";
import PdfPreviewPanel from "./components/PdfPreviewPanel";
import { useIncomingExtraction } from "./components/useIncomingExtraction";
import { useOutgoingExtraction } from "./components/useOutgoingExtraction";


export default function DocumentUploadPage() {
  const [docType, setDocType] = useState<DocumentType>("incoming");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const incoming = useIncomingExtraction();
  const outgoing = useOutgoingExtraction();

  const handleFileDrop = useCallback(
    async (file: File) => {
      setUploadedFile(file);
      const res = await extractPdf(file);

      console.log("res: ", res);
    },
    [docType, incoming, outgoing],
  );

  const handleClearFile = useCallback(() => {
    setUploadedFile(null);
    incoming.reset();
    outgoing.reset();
  }, [incoming, outgoing]);

  const handleTypeChange = useCallback(
    (type: DocumentType) => {
      setDocType(type);
      setUploadedFile(null);
      incoming.reset();
      outgoing.reset();
    },
    [incoming, outgoing],
  );

  return (
    <div>
      <PageMeta
        title="Document Upload | DTRS"
        description="Upload a PDF document to extract and review its metadata."
      />
      <PageBreadcrumb pageTitle="Document Upload" />

      <ComponentCard
        title="Upload"
        desc="Upload a PDF to automatically extract its metadata for routing and tracking."
        className="mb-8"
      >
        <DocumentTypeToggle value={docType} onChange={handleTypeChange} />
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
            {uploadedFile ? (
              <PdfPreviewPanel file={uploadedFile} onClear={handleClearFile} />
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
