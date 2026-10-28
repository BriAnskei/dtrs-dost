import { NotFoundException } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { IncomingDocumentDetailsDto } from "../../dto/incoming-document-details.dto";
import { IncomingDocumentsRepository } from "../../repository/incoming-document.repository";
import { GetIncomingDocumentDetailsQuery } from "./get-incoming-document-details.query";

@QueryHandler(GetIncomingDocumentDetailsQuery)
export class GetIncomingDocumentDetailsHandler
  implements IQueryHandler<GetIncomingDocumentDetailsQuery>
{
  constructor(
    private readonly incomingDocumentsRepository: IncomingDocumentsRepository,
  ) {}

  async execute(
    query: GetIncomingDocumentDetailsQuery,
  ): Promise<IncomingDocumentDetailsDto> {
    const result = await this.incomingDocumentsRepository.findByIdWithFullDetails(
      query.id,
    );

    if (!result) {
      throw new NotFoundException(`Incoming document not found`);
    }

    const { document, ...counts } = result;
    const dto = new IncomingDocumentDetailsDto();

    dto.id = document.id;
    dto.document_file_id = document.document_file_id;

    dto.file_name = document.document_file.file_name;
    dto.object_key = document.document_file.object_key;
    dto.code = document.document_file.code;

    dto.tracking_sequence = document.tracking_sequence;

    dto.subject = document.subject;
    dto.document_from = document.document_from;
    dto.recipient = document.recipient;
    dto.date_received = document.date_received;

    dto.status = document.status;
    dto.summary = document.summary;

    dto.updated_at = document.updated_at;
    dto.created_at = document.created_at;

    dto.uploader_id = document.document_file.uploader_id;
    dto.uploader_name = document.document_file.uploader?.full_name ?? null;

    dto.assignments = counts.totalAssignments;
    dto.in_progress_assignment_count = counts.inProgressAssignmentCount;
    dto.action_taken_count = counts.actionTakenCount;
    dto.assigned_division_count = counts.assignedDivisionCount;

    return dto;
  }
}
