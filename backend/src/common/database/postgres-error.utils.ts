import { QueryFailedError } from "typeorm";
import { PostgresDriverError } from "./postgres-error.types";

export function getPostgresError(
  error: unknown,
): PostgresDriverError | null {
  if (!(error instanceof QueryFailedError)) return null;

  return error.driverError as PostgresDriverError;
}

export function isPostgresError(
  error: unknown,
  code: string,
  constraint?: string,
): boolean {
  const pgError = getPostgresError(error);

  if (!pgError || pgError.code !== code) return false;

  return constraint ? pgError.constraint === constraint : true;
}
