/**
 * Unit tests for `ExtractionQueueController` (`/extracted-document-queue`).
 *
 * THE CONTROLLER (controllers/extracted-document-queue.controller.ts):
 *
 *   @Controller("extracted-document-queue")
 *   export class ExtractionQueueController {
 *     constructor(
 *       private readonly invalidateQueue: InvalidateExtractedDocumentQueueUseCase,
 *       private readonly createExtractedDocumentQueue: CreateExtractedDocumentQueueUseCase,
 *       private readonly getFileSteam: GetDocumentFileStreamUseCase,
 *       private readonly deleteExtractedDocumentQueue: DeleteExtractedDocumentQueueUseCase,
 *       private readonly service: ExtractedDocumentQueueService,
 *     ) {}
 *
 *   @Post()        @Roles(ReceiverOfficer) @Idempotent(...) create(...)
 *   @Get()         @Roles(SuperAdmin, Admin) findAll(query)
 *   @Get("my")     @Roles(ReceiverOfficer) findMyQueues(req, query)
 *   @Get(":id/review") @Roles(SuperAdmin, Admin) findOne(id)
 *   @Get(":id/file")   @Roles(SuperAdmin, Admin) file(id)
 *   @Patch(":id/invalidate") @Roles(SuperAdmin, Admin) @HttpCode(OK) invalidate(id, dto)
 *   @Delete(":id")  @Roles(ReceiverOfficer) @HttpCode(NO_CONTENT) delete(id)
 *
 * STRATEGY:
 *   Controllers here are thin delegation layers: they extract HTTP params/body
 *   and forward to the use-case/service, returning the result. We mock every
 *   collaborator and assert:
 *   - Correct argument forwarding (params parsed, body forwarded).
 *   - Correct return shape passes through.
 *   - @Roles / @HttpCode decorator metadata is applied (so a guard enforcing
 *     roles at the Nest runtime would see the right requirement).
 *
 * We do NOT exercise the @Idempotent / FileInterceptor / ParsePdfFilePipe guards
 * or global roles guards here — those are framework-level concerns. We only
 * assert the metadata the controller itself declares, so that role changes are
 * caught by static reflection if someone forgets to update the decorator.
 */

// uuid@14 is ESM-only and Jest can't parse it. Mock before other imports that
// pull it in transitively (via buildDocumentKey → create-extracted-document-queue usecase).
jest.mock("uuid", () => ({ v4: jest.fn(() => "mock-uuid") }));
// These controller deps ship ESM-only builds — stub them so Jest (CommonJS)
// can load the controller module at all.
jest.mock("@nestjs/idempotency", () => ({ Idempotent: () => () => undefined }));
jest.mock("content-disposition", () => ({
  create: jest.fn(() => ({})),
}));
jest.mock("multer", () => ({ memoryStorage: jest.fn(() => ({})) }));

import { Test } from "@nestjs/testing";
import { HttpStatus } from "@nestjs/common";
import { Readable } from "node:stream";
import { HTTP_CODE_METADATA } from "@nestjs/common/constants";
import { ROLES_KEY } from "../../../../auth/authorization/decorator/roles.decorator";
import { Role } from "../../../../auth/authorization/enum/roles.enum";
import type { AuthenticatedRequest } from "../../../../auth/authentication/types/authenticated-request";
import type { CreateExtractedDocumentDto } from "../dto/create-extracted-document-dto";
import type { FindExtractedDocumentQueuesQueryDto } from "../dto/find-extracted-document-queues-query.dto";
import type { FindMyExtractedDocumentQueuesQueryDto } from "../dto/find-my-extracted-document-queues-query.dto";
import type { InvalidateExtractedDocumentQueueDto } from "../dto/invalidate-extracted-document-queue.dto";
import { ExtractedDocumentQueueService } from "../service/extracted-document-queue.service";
import { CreateExtractedDocumentQueueUseCase } from "../use-cases/create-extracted-document-queue.usecase";
import { DeleteExtractedDocumentQueueUseCase } from "../use-cases/delete-extracted-document-queue.usecase";
import { GetDocumentFileStreamUseCase } from "../use-cases/get-document-file-stream.usecase";
import { InvalidateExtractedDocumentQueueUseCase } from "../use-cases/invalidate-extracted-document-queue.usecase";
import { ExtractionQueueController } from "./extracted-document-queue.controller";

/** Build the controller with every use-case/service mocked. */
async function buildController(
  overrides: Partial<{
    invalidateQueue: Partial<InvalidateExtractedDocumentQueueUseCase>;
    createExtractedDocumentQueue: Partial<CreateExtractedDocumentQueueUseCase>;
    getFileSteam: Partial<GetDocumentFileStreamUseCase>;
    deleteExtractedDocumentQueue: Partial<DeleteExtractedDocumentQueueUseCase>;
    service: Partial<ExtractedDocumentQueueService>;
  }> = {},
) {
  const mocks = {
    invalidateQueue: { execute: jest.fn() },
    createExtractedDocumentQueue: { execute: jest.fn() },
    getFileSteam: { execute: jest.fn() },
    deleteExtractedDocumentQueue: { execute: jest.fn() },
    service: {
      findAll: jest.fn(),
      findAllByUploaderId: jest.fn(),
      findOneForReview: jest.fn(),
    },
    ...overrides,
  };

  const moduleRef = await Test.createTestingModule({
    controllers: [ExtractionQueueController],
    providers: [
      { provide: InvalidateExtractedDocumentQueueUseCase, useValue: mocks.invalidateQueue },
      { provide: CreateExtractedDocumentQueueUseCase, useValue: mocks.createExtractedDocumentQueue },
      { provide: GetDocumentFileStreamUseCase, useValue: mocks.getFileSteam },
      { provide: DeleteExtractedDocumentQueueUseCase, useValue: mocks.deleteExtractedDocumentQueue },
      { provide: ExtractedDocumentQueueService, useValue: mocks.service },
    ],
  }).compile();

  return {
    controller: moduleRef.get(ExtractionQueueController),
    // Cast to jest.Mocked<...> so call assertions + mockResolvedValue type-check.
    mocks: mocks as unknown as {
      invalidateQueue: jest.Mocked<InvalidateExtractedDocumentQueueUseCase>;
      createExtractedDocumentQueue: jest.Mocked<CreateExtractedDocumentQueueUseCase>;
      getFileSteam: jest.Mocked<GetDocumentFileStreamUseCase>;
      deleteExtractedDocumentQueue: jest.Mocked<DeleteExtractedDocumentQueueUseCase>;
      service: jest.Mocked<ExtractedDocumentQueueService>;
    },
  };
}

/** Fake authenticated request carrying the receiver officer user id. */
function makeReq(userId = "receiver-1"): AuthenticatedRequest {
  return { user: { id: userId } } as AuthenticatedRequest;
}

describe("ExtractionQueueController", () => {
  describe("create", () => {
    it("forwards file, dto, and user id to CreateExtractedDocumentQueueUseCase", async () => {
      const { controller, mocks } = await buildController();

      const file = { originalname: "test.pdf", buffer: Buffer.from("pdf") } as Express.Multer.File;
      const dto = { chunks: [] } as unknown as CreateExtractedDocumentDto;
      const req = makeReq("user-abc");
      mocks.createExtractedDocumentQueue.execute!.mockResolvedValue({ decision: "ACCEPT" } as never);

      const result = await controller.create(file, dto, req);

      expect(mocks.createExtractedDocumentQueue.execute).toHaveBeenCalledTimes(1);
      expect(mocks.createExtractedDocumentQueue.execute).toHaveBeenCalledWith(
        file,
        dto,
        "user-abc",
      );
      expect(result).toEqual({ decision: "ACCEPT" });
    });
  });

  describe("findAll", () => {
    it("forwards the query to the service and returns the paginated result", async () => {
      const { controller, mocks } = await buildController();

      const query = { limit: 10, sort: "newest" } as unknown as FindExtractedDocumentQueuesQueryDto;
      const page = { data: [{ id: "q1" }], nextCursor: "cursor" };
      mocks.service.findAll!.mockResolvedValue(page as never);

      const result = await controller.findAll(query);

      expect(mocks.service.findAll).toHaveBeenCalledWith(query);
      expect(result).toBe(page);
    });
  });

  describe("findMyQueues", () => {
    it("forwards req.user.id and query to service.findAllByUploaderId", async () => {
      const { controller, mocks } = await buildController();

      const req = makeReq("uploader-9");
      const query = { limit: 10 } as unknown as FindMyExtractedDocumentQueuesQueryDto;
      const page = { data: [{ id: "q1" }], nextCursor: null };
      mocks.service.findAllByUploaderId!.mockResolvedValue(page as never);

      const result = await controller.findMyQueues(req, query);

      expect(mocks.service.findAllByUploaderId).toHaveBeenCalledWith("uploader-9", query);
      expect(result).toBe(page);
    });
  });

  describe("findOne (review)", () => {
    it("forwards the id to service.findOneForReview", async () => {
      const { controller, mocks } = await buildController();

      const review = { id: "q1", fields: [], chunk_locations: {} };
      mocks.service.findOneForReview!.mockResolvedValue(review as never);

      const result = await controller.findOne("queue-id-1");

      expect(mocks.service.findOneForReview).toHaveBeenCalledWith("queue-id-1");
      expect(result).toBe(review);
    });
  });

  describe("file", () => {
    it("returns a StreamableFile from the usecase stream + filename", async () => {
      const { controller, mocks } = await buildController();

      const stream = { pipe: jest.fn() } as unknown as Readable;
      mocks.getFileSteam.execute!.mockResolvedValue({
        stream,
        filename: "report.pdf",
      });

      const result = await controller.file("queue-id-1");

      expect(mocks.getFileSteam.execute).toHaveBeenCalledWith("queue-id-1");
      // StreamableFile wraps the stream + content-disposition header.
      expect(result).toBeDefined();
      expect(result.options.type).toBe("application/pdf");
      expect(result.options.disposition).toBeDefined();
    });
  });

  describe("invalidate", () => {
    it("forwards queueId + response to the usecase", async () => {
      const { controller, mocks } = await buildController();

      mocks.invalidateQueue.execute!.mockResolvedValue({ id: "q1", status: "INVALIDATED" } as never);
      const dto = { response: "unreadable" } as InvalidateExtractedDocumentQueueDto;

      const result = await controller.invalidate("queue-id-1", dto);

      expect(mocks.invalidateQueue.execute).toHaveBeenCalledWith({
        queueId: "queue-id-1",
        response: "unreadable",
      });
      expect(result).toEqual({ id: "q1", status: "INVALIDATED" });
    });

    it("passes undefined response when dto has no response field", async () => {
      const { controller, mocks } = await buildController();

      mocks.invalidateQueue.execute!.mockResolvedValue({ id: "q1", status: "INVALIDATED", invalidation_response: null } as never);
      const dto = {} as InvalidateExtractedDocumentQueueDto;

      await controller.invalidate("queue-id-1", dto);

      expect(mocks.invalidateQueue.execute).toHaveBeenCalledWith({
        queueId: "queue-id-1",
        response: undefined,
      });
    });
  });

  describe("delete", () => {
    it("forwards id to DeleteExtractedDocumentQueueUseCase and resolves void", async () => {
      const { controller, mocks } = await buildController();

      mocks.deleteExtractedDocumentQueue.execute!.mockResolvedValue(undefined as never);

      await expect(controller.delete("queue-id-1")).resolves.toBeUndefined();

      expect(mocks.deleteExtractedDocumentQueue.execute).toHaveBeenCalledWith("queue-id-1");
    });
  });

  /*
   * ── Decorator metadata ───────────────────────────────────────────────
   *
   * @Roles writes the role array under `Reflect.metadata(ROLES_KEY, roles)`
   * onto the method function; @HttpCode writes under the `__httpCode__` key
   * (HTTP_CODE_METADATA) on the same method. We read both via Reflect.getMetadata
   * on the prototype method — the same way Nest's runtime does — to assert that
   * role guards would enforce the declared gates.
   */
  describe("decorator metadata", () => {
    it("create is restricted to ReceiverOfficer", async () => {
      const { controller } = await buildController();

      const create = (controller.constructor.prototype as Record<string, unknown>).create as Function;
      const roles = Reflect.getMetadata(ROLES_KEY, create);
      expect(roles).toEqual([Role.ReceiverOfficer]);
    });

    it("findAll is restricted to SuperAdmin + Admin", async () => {
      const { controller } = await buildController();

      const findAll = (controller.constructor.prototype as Record<string, unknown>).findAll as Function;
      const roles = Reflect.getMetadata(ROLES_KEY, findAll);
      expect(roles).toEqual([Role.SuperAdmin, Role.Admin]);
    });

    it("findMyQueues is restricted to ReceiverOfficer", async () => {
      const { controller } = await buildController();

      const fn = (controller.constructor.prototype as Record<string, unknown>).findMyQueues as Function;
      const roles = Reflect.getMetadata(ROLES_KEY, fn);
      expect(roles).toEqual([Role.ReceiverOfficer]);
    });

    it("invalidate responds with HTTP 200 (overriding default 200 for PATCH)", async () => {
      const { controller } = await buildController();

      const invalidate = (controller.constructor.prototype as Record<string, unknown>).invalidate as Function;
      const code = Reflect.getMetadata(HTTP_CODE_METADATA, invalidate);
      expect(code).toBe(HttpStatus.OK);
    });

    it("delete responds with HTTP 204 NO_CONTENT", async () => {
      const { controller } = await buildController();

      const del = (controller.constructor.prototype as Record<string, unknown>).delete as Function;
      const code = Reflect.getMetadata(HTTP_CODE_METADATA, del);
      expect(code).toBe(HttpStatus.NO_CONTENT);
    });
  });
});
