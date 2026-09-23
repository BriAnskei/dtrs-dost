import { Buffer } from "node:buffer";

export function encodeCursor<T>(cursor: T): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeCursor<T>(cursor: string): T {
  const decoded = Buffer.from(cursor, "base64url").toString("utf8");

  return JSON.parse(decoded) as T;
}
