import { useCallback, useState } from "react";
import axios from "axios";
import { ExtractionStatus, IncomingMetadata, ExtractionResponseType } from "./types";

interface SaveParams {
  queueId: string;
  documentFileId: string;
}

interface SaveInvalidParams {
  invalidDocId: string;
  documentFileId: string;
}

export const useIncomingExtraction = () => {
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [saving, setSaving] = useState(false);
  const [metadata, setMetadata] = useState<IncomingMetadata>({
    idCode: "",
    subject: "",
    from: "",
    to: "",
    dateReceived: "",
    routedTo: [],
    noticeOfAction: "",
    actionTaken: "",
    summary: "",
  });

  const extract = useCallback((_file: File) => {
    setStatus("extracting");
    setMetadata({
      idCode: "",
      subject: "",
      from: "",
      to: "",
      dateReceived: "",
      routedTo: [],
      noticeOfAction: "",
      actionTaken: "",
      summary: "",
    });
  }, []);

  const updateField = useCallback(
    <K extends keyof IncomingMetadata>(field: K, value: IncomingMetadata[K]) => {
      setMetadata((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setMetadata({
      idCode: "",
      subject: "",
      from: "",
      to: "",
      dateReceived: "",
      routedTo: [],
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
      routedTo: payload.routed_to ?? [],
    }));
  }, []);

  // Persists the reviewed metadata: marks the queue entry as received,
  // creates the incoming_documents record, and creates document_routing rows.
  const save = useCallback(
    async ({
      queueId,
      documentFileId,
    }: SaveParams): Promise<{ success: boolean; message: string }> => {
      setSaving(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
        const response = await axios.post(`${apiUrl}/upload/incomming/save`, {
          queueId,
          documentFileId,
          subject: metadata.subject,
          from: metadata.from,
          to: metadata.to,
          dateReceived: metadata.dateReceived,
          summary: metadata.summary,
          routedTo: metadata.routedTo,
          noticeOfAction: metadata.noticeOfAction,
          actionTaken: metadata.actionTaken,
        });
        return { success: true, message: response.data?.message ?? "Saved successfully" };
      } catch (error: any) {
        console.error("Failed to save incoming document:", error);
        const message =
          error?.response?.data?.message || "Failed to save document. Please try again.";
        return { success: false, message };
      } finally {
        setSaving(false);
      }
    },
    [metadata],
  );

  // Persists an invalid document: deletes the invalid_documents record,
  // creates an incoming_doc_queue entry (status: received), creates the
  // incoming_documents record, and creates document_routing rows.
  const saveInvalid = useCallback(
    async ({
      invalidDocId,
      documentFileId,
    }: SaveInvalidParams): Promise<{ success: boolean; message: string }> => {
      setSaving(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
        const response = await axios.post(`${apiUrl}/upload/incomming/save-invalid`, {
          invalidDocId,
          documentFileId,
          subject: metadata.subject,
          from: metadata.from,
          to: metadata.to,
          dateReceived: metadata.dateReceived,
          summary: metadata.summary,
          routedTo: metadata.routedTo,
          noticeOfAction: metadata.noticeOfAction,
          actionTaken: metadata.actionTaken,
        });
        return { success: true, message: response.data?.message ?? "Saved successfully" };
      } catch (error: any) {
        console.error("Failed to save invalid document:", error);
        const message =
          error?.response?.data?.message || "Failed to save document. Please try again.";
        return { success: false, message };
      } finally {
        setSaving(false);
      }
    },
    [metadata],
  );

  return {
    status,
    metadata,
    saving,
    extract,
    updateField,
    reset,
    setExtractionField,
    setStatus,
    save,
    saveInvalid,
  };
};
