import { useCallback, useState } from "react";
import type { ExtractionResponseType, ExtractionStatus, IncomingMetadata } from "./types";

export const useIncomingExtraction = () => {
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [metadata, setMetadata] = useState<IncomingMetadata>({
    idCode: "",
    subject: "",
    from: "",
    to: "",
    dateReceived: "",
    routedTo: "",
    noticeOfAction: "",
    actionTaken: "",
    summary: "",
  });

  const extract = useCallback((_file: File) => {
    setMetadata({
      idCode: "",
      subject: "",
      from: "",
      to: "",
      dateReceived: "",
      routedTo: "",
      noticeOfAction: "",
      actionTaken: "",
      summary: "",
    });
  }, []);

  const updateField = useCallback((field: keyof IncomingMetadata, value: string) => {
    setMetadata((prev) => ({ ...prev, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setMetadata({
      idCode: "",
      subject: "",
      from: "",
      to: "",
      dateReceived: "",
      routedTo: "",
      noticeOfAction: "",
      actionTaken: "",
      summary: "",
    });
  }, []);

  const formatDateTimeLocal = (date: string, time: string) => {
    const parsed = new Date(`${date} ${time}`);
    if (isNaN(parsed.getTime())) return "";
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    const hours = String(parsed.getHours()).padStart(2, "0");
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const setExtractionField = useCallback((payload: ExtractionResponseType) => {
    setMetadata((prev) => ({
      ...prev,
      subject: payload.subject,
      from: payload.from,
      to: payload.to,
      dateReceived: formatDateTimeLocal(payload.date_received, payload.time_received),
      summary: payload.summary,
    }));
  }, []);

  return {
    status,
    metadata,
    extract,
    updateField,
    reset,
    setExtractionField,
    setStatus,
  };
};
