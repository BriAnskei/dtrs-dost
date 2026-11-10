import { ConflictException, HttpException, NotFoundException } from "@nestjs/common";
import { isPostgresError } from "../../../../common/database/postgres-error.utils";

export function mapIncomingDocumentError(error: unknown): HttpException | null {
  if (isPostgresError(error, "23505", "uq_incoming_document_routing")) {
    return new ConflictException(
      "This incoming document is already routed to this division.",
      { cause: error },
    );
  }

  if (isPostgresError(error, "23503", "fk_idr_division")) {
    return new NotFoundException("Division does not exist.", {
      cause: error,
    });
  }

  if (isPostgresError(error, "23503", "fk_idr_incoming_document")) {
    return new NotFoundException("Incoming document does not exist.", {
      cause: error,
    });
  }

  return null;
}
