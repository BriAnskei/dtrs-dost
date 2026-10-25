import { Readable } from "node:stream";

export interface FileStreamResponse {
  stream: Readable;
  filename: string;
}
