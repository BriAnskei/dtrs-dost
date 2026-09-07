import { useCallback, useState } from "react";
import { pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist";
import Tesseract from "tesseract.js";
import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import DocumentTypeToggle from "./components/DocumentTypeToggle";
// Components extracted to separate files
import DropZone from "./components/DropZone";
import IncomingExtractionPanel from "./components/IncomingExtractionPanel";
import OutgoingExtractionPanel from "./components/OutgoingExtractionPanel";
import PdfPreviewPanel from "./components/PdfPreviewPanel";
// Types
import type { DocumentType } from "./components/types";
// Hooks extracted
import { useIncomingExtraction } from "./components/useIncomingExtraction";
import { useOutgoingExtraction } from "./components/useOutgoingExtraction";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function DocumentUploadPage() {
  const [docType, setDocType] = useState<DocumentType>("incoming");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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

  const extractMetadataAi = async (documentText: string) => {
    try {
      // const res = await axios.post(
      // 	"https://openrouter.ai/api/v1/chat/completions",
      // 	{
      // 		model: "openai/gpt-oss-120b:free",
      // 		messages: [
      // 			{
      // 				role: "system",
      // 				content: `
      //             You are a document information extraction assistant.

      //             Extract the following information from the document:

      //             - Subject
      //             - From
      //             - To
      //             - Date recieved
      //             - Time recieved

      //            - Summary:
      //              Write exactly 3 sentences summarizing the document.
      //              The summary must explain:
      //              1. What the document is about.
      //              2. The main purpose, request, announcement, instruction, or action stated in the document.
      //              3. What the document represents.
      //              4. Highlight important information by making key words or phrases bold using Markdown format:
      //              - Use **bold** for important names, organizations, dates, actions, requests, decisions, or main topics.
      //              - Do not bold every word; only highlight the most relevant information.

      //             Return JSON only.
      //             Do not include explanations, markdown, or additional text.

      //             Use this exact JSON format:

      //             {
      //               "subject": "string",
      //               "from": "string",
      //               "to": "string",
      //               "date_received": "YYYY-MM-DD",
      //               "time_received": "HH:mm"
      //               "summary": "string"
      //             }

      //             If any field cannot be found in the document, return an empty string.
      //             `,
      // 			},
      // 			{
      // 				role: "user",
      // 				content: `Extract the information from this document:\n\n${documentText}`,
      // 			},
      // 		],
      // 	},
      // 	{
      // 		headers: {
      // 			Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_KEY}`,
      // 			"Content-Type": "application/json",
      // 		},
      // 	},
      // );
      return JSON.parse(res.data.choices[0].message.content) as any;
    } catch (error) {
      console.error(error);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleFileDrop = useCallback(
    async (file: File) => {
      setUploadedFile(file);
      if (docType === "incoming") incoming.extract(file);
      else outgoing.extract(file);

      let text = await extractPdfText(file);
      incoming.setStatus("extracting");

      if (!text || text.length <= 50) {
        text = await extractOCR(file);
      }

      // const extractionRes = await extractMetadataAi(text!);

      console.log("extracted: ", extractionRes);
      if (extractionRes) {
        incoming.setExtractionField(extractionRes);
        incoming.setStatus("done");
      }
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
