import { QueryFailedError } from "typeorm";

const DOCUMENT_CODE_CONSTRAINT = "UQ_document_files_code";

export function isDocumentCodeCollision(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as {
    code?: string;
    constraint?: string;
  };

  return (
    driverError.code === "23505" && driverError.constraint === DOCUMENT_CODE_CONSTRAINT
  );
}
