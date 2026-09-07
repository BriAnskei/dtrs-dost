import { useCallback, useState } from "react";
import { generateIdCode, nowDateTimeLocal } from "./helpers";
import type { ExtractionStatus, OutgoingMetadata } from "./types";

export const useOutgoingExtraction = () => {
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [metadata, setMetadata] = useState<OutgoingMetadata>({
    idCode: "",
    to: "",
    datePrepared: "",
    subject: "",
    dateReceived: "",
    receivedBy: "",
  });

  const extract = useCallback((_file: File) => {
    setStatus("extracting");
    setMetadata({
      idCode: "",
      to: "",
      datePrepared: "",
      subject: "",
      dateReceived: "",
      receivedBy: "",
    });
    // Simulate extraction (replace with real logic later)
    setTimeout(() => {
      setMetadata({
        idCode: generateIdCode(),
        to: "Department of Budget and Management",
        datePrepared: "2026-06-10",
        subject: "Transmittal of FY2026 Work and Financial Plan",
        dateReceived: nowDateTimeLocal(),
        receivedBy: "Maria Santos",
      });
      setStatus("done");
    }, 2200);
  }, []);

  const updateField = useCallback((field: keyof OutgoingMetadata, value: string) => {
    setMetadata((prev) => ({ ...prev, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setMetadata({
      idCode: "",
      to: "",
      datePrepared: "",
      subject: "",
      dateReceived: "",
      receivedBy: "",
    });
  }, []);

  return { status, metadata, extract, updateField, reset };
};
