import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { IncomingDocumentStatus } from "../entities/incoming-document-entity";
import { IncomingDocumentStatusHistoryEntity } from "../entities/incoming-document-status-history-entity";

interface CreateStatusHistoryParams {
  incoming_document_id: string;
  status_from: IncomingDocumentStatus;
  status_to: IncomingDocumentStatus;
  remarks: string | null;
  changed_by: string;
}

@Injectable()
export class IncomingDocumentStatusRepository {
  async createStatusHistory(
    manager: EntityManager,
    data: CreateStatusHistoryParams,
  ): Promise<void> {
    const repository = manager.getRepository(IncomingDocumentStatusHistoryEntity);

    const history = repository.create(data);

    await repository.save(history);
  }
}
