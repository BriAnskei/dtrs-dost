import type {
  IncomingDocumentDetailsDto,
  InvalidationResponseDto,
  ReceiverQueueDetailsDto,
} from "../../types/get-incoming-document-by-queue.dto";

export function isIncomingDocumentDetails(
  data: ReceiverQueueDetailsDto | undefined,
): data is IncomingDocumentDetailsDto {
  return !!data && "subject" in data;
}

export function isInvalidationResponse(
  data: ReceiverQueueDetailsDto | undefined,
): data is InvalidationResponseDto {
  return !!data && "response" in data;
}
