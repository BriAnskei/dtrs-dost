import { Buffer } from "node:buffer";

export interface UserCursor {
  createdAt: string;
  id: string;
}

export function encodeCursor(cursor: UserCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeCursor(cursor: string): UserCursor {
  const decoded = Buffer.from(cursor, "base64url").toString("utf8");

  return JSON.parse(decoded) as UserCursor;
}
