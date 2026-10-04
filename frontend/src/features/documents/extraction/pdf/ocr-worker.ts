import { createWorker } from "tesseract.js";
import { PDF_EXTRACTION_CONFIG } from "./config";

let workerPromise: ReturnType<typeof createWorker> | null = null;

export function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = createWorker(PDF_EXTRACTION_CONFIG.ocrLanguage);
  }

  return workerPromise;
}

export async function terminateOcrWorker() {
  if (!workerPromise) {
    return;
  }

  const worker = await workerPromise;

  await worker.terminate();

  workerPromise = null;
}
