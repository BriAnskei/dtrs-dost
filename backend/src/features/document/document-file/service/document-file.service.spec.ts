import { Test, TestingModule } from "@nestjs/testing";
import { EntityManager } from "typeorm";
import { DocumentFileEntity } from "../entities/document-file.entity";
import { DocumentFileRepository } from "../repository/document-file.repository";
import { DocumentFileService } from "./document-file.service";
import { NotFoundException } from "@nestjs/common";

describe("DocumentFileService", () => {
  let service: DocumentFileService;
  let repository: jest.Mocked<DocumentFileRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentFileService,
        {
          provide: DocumentFileRepository,
          useValue: {
            create: jest.fn(),
            updateCode: jest.fn(),
            findById: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentFileService>(DocumentFileService);
    repository = module.get(DocumentFileRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("create", () => {
    it("should call repository.create with data and manager", async () => {
      const data: Partial<DocumentFileEntity> = {
        file_name: "test.pdf",
        object_key: "key-123",
      };
      const manager = {} as EntityManager;
      const saved: DocumentFileEntity = {
        id: "uuid-1",
        code: null,
        file_name: "test.pdf",
        object_key: "key-123",
        uploader: null,
        uploader_id: null,
      };

      repository.create.mockResolvedValue(saved);

      const result = await service.create(data, manager);

      expect(repository.create).toHaveBeenCalledWith(data, manager);
      expect(result).toBe(saved);
    });
  });

  describe("updateCode", () => {
    it("should call repository.updateCode with id, code, manager", async () => {
      const manager = {} as EntityManager;
      repository.updateCode.mockResolvedValue(true);

      await service.updateCode("uuid-1", "CODE-001", manager);

      expect(repository.updateCode).toHaveBeenCalledWith("uuid-1", "CODE-001", manager);
    });

    it("should throw NotFoundException when update returns false", async () => {
      const manager = {} as EntityManager;
      repository.updateCode.mockResolvedValue(false);

      await expect(service.updateCode("uuid-1", "CODE-001", manager)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findById", () => {
    it("should return entity when found", async () => {
      const entity: DocumentFileEntity = {
        id: "uuid-1",
        code: "CODE-001",
        file_name: "test.pdf",
        object_key: "key-123",
        uploader: null,
        uploader_id: null,
      };

      repository.findById.mockResolvedValue(entity);

      const result = await service.findById("uuid-1");

      expect(repository.findById).toHaveBeenCalledWith("uuid-1", undefined);
      expect(result).toBe(entity);
    });

    it("should throw NotFoundException when entity is null", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById("uuid-1")).rejects.toThrow(NotFoundException);
    });

    it("should pass manager to repository.findById when provided", async () => {
      const manager = {} as EntityManager;
      const entity: DocumentFileEntity = {
        id: "uuid-1",
        code: null,
        file_name: "test.pdf",
        object_key: "key-123",
        uploader: null,
        uploader_id: null,
      };

      repository.findById.mockResolvedValue(entity);

      await service.findById("uuid-1", manager);

      expect(repository.findById).toHaveBeenCalledWith("uuid-1", manager);
    });
  });

  describe("delete", () => {
    it("should call repository.delete with id and manager", async () => {
      const manager = {} as EntityManager;
      repository.delete.mockResolvedValue(true);

      await service.delete("uuid-1", manager);

      expect(repository.delete).toHaveBeenCalledWith("uuid-1", manager);
    });

    it("should throw NotFoundException when delete returns false", async () => {
      const manager = {} as EntityManager;
      repository.delete.mockResolvedValue(false);

      await expect(service.delete("uuid-1", manager)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
