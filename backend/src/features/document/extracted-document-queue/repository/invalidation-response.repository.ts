import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { InvalidationResponseEntity } from "../entities/invalidation-response.entity";

@Injectable()
export class InvalidationResponseRepository {
  constructor(
    @InjectRepository(InvalidationResponseEntity)
    private readonly repository: Repository<InvalidationResponseEntity>,
  ) {}

  async create(
    invalidation: Partial<InvalidationResponseEntity>,
    manager?: EntityManager,
  ): Promise<InvalidationResponseEntity> {
    const repository =
      manager?.getRepository(InvalidationResponseEntity) ?? this.repository;

    const entity = repository.create(invalidation);

    return repository.save(entity);
  }

  async findByQueueId(queueId: string): Promise<InvalidationResponseEntity | null> {
    return this.repository.findOne({
      where: {
        extracted_document_queue_id: queueId,
      },
    });
  }
}
