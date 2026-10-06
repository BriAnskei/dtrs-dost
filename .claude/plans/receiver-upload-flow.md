# Plan: Receiver upload document flow

Goal: Receiver (`Role.ReceiverOfficer`) uploads a file; server extracts fields via LLM (reuse `ExtractionService`); saves file to S3; creates `document_file` + `extracted_document_queue` for later admin review.

## Current state (stubs)
- `extracted-document-queue.controller.ts` — `ExtractionQueueController`, `@Post()` `@Roles(Role.ReceiverOfficer)`, `FileInterceptor("file")`, `create()` body empty.
- `ExtractedDocumentQueueFacade` — injects `ExtractionService`, `DocumentFileService`, `ExtractedDocumentQueueService`, `S3Service`. No business method yet.
- `ExtractedDocumentQueueService.create()` — empty.
- `DocumentFileService` — thin, no `create` method; no `DocumentFileModule`.
- `DocumentFileEntity` / `ExtractedDocumentQueueEntity` — defined but **not** registered via `forFeature` (no feature module exists yet).
- `ExtractionService.extract()` — full LLM extraction + validation. Exported by `ExtractionModule`.
- `S3Service.upload(key, body: Buffer, contentType)` — ready. `StorageModule` exists, not in `AppModule`.
- `createExtractedDocumentDto` — has `documentType` + `chunks` (chunks = `ReceiverChunkDto`, extends `ExtractionChunkDto` with `sourceConfidence`).
- **No OCR/text-extraction provider anywhere.** `extract(ocr/text)` step has no server-side implementation.

## Decision point A — OCR source (BLOCKER for final shape)
Two options:

**Option A1 (recommended, minimal):** OCR/text done client-side. Receiver frontend extracts text → sends `chunks` (chunkId + text) as multipart field alongside `file`. Controller reuses `ExtractionService` on those chunks. Server-side OCR = future. Matches existing DTO shape; no new provider.

**Option A2 (full server-side OCR):** Add an `OcrModule`/`TextExtractor` provider (tesseract / pdf-parse / Google Vision) that turns `file.buffer` → text → chunks. Controller calls it instead of trusting client chunks. Larger scope (new dep, async, memory/CPU).

## Flow (Option A1 baseline)
1. `ExtractionQueueController.create(file, dto, req)` → calls `facade.receiveDocument(file, dto, req)` (thin; validation via global `ValidationPipe` already validates DTO).
2. `facade.receiveDocument`:
   1. `extracted = extractionService.extract({ documentType, chunks: dto.chunks })`  — LLM field extraction + server-side validation. Throws `BadRequestException` on hallucination/duplicate; propagated (upload rejected).
   2. `objectKey = "documents/<uuid>"` (convention TBD).
   3. `s3Service.upload(objectKey, file.buffer, file.mimetype)`.
   4. TXN: `documentFileService.create({ file_name, object_key, uploader_id: req.user.id })` → `ExtractedDocumentQueueEntity.create({ document_file_id, extracted_data: extracted.fields, decision: "REVIEW" })`.
   5. Return `{ queueId, documentFileId, fields }`.
3. `decision` = `REVIEW` for all receiver uploads (admins pick ACCEPT/INVALID later). `extracted_data` jsonb = full `ExtractedField[]` (array of {field,value,chunkIds,aiConfidence}); future review UI parses it.

## Files to create/modify

### Create
- `backend/src/features/document/document-file/document-file.module.ts`
  - `TypeOrmModule.forFeature([DocumentFileEntity])`, providers `[DocumentFileRepository, DocumentFileService]`, exports `[DocumentFileService]`.
- `backend/src/features/document/extracted-document-queue/extracted-document-queue.module.ts`
  - imports `TypeOrmModule.forFeature([ExtractedDocumentQueueEntity])`, `ExtractionModule`, `DocumentFileModule`, `StorageModule`.
  - providers `[ExtractedDocumentQueueRepository, ExtractedDocumentQueueService, ExtractedDocumentQueueFacade]`.
  - controllers `[ExtractionQueueController]`.

### Modify
- `document-file.service.ts` — add `create(payload)` → `repository.create` + `save`.
- `extracted-document-queue.service.ts` — add `create(payload)` → `repository.create` + `save`.
- `document-file.repository.ts` — expose `create`/`save` (or add `create` method). Keep thin like service; OR fold create into repository. Suggest: keep repository thin (no methods), put `create()` in `DocumentFileService` delegating to `this.repository.create`+`save`. Match existing style: service just holds repo reference, no methods. **Decision point B** below.
- `extracted-document-queue.repository.ts` — same question.
- `extracted-document-queue.facade.ts` — add `receiveDocument(file, dto, req)`.
- `extracted-document-queue.controller.ts` — implement `create()` body → `facade.receiveDocument`. Switch `FileInterceptor` storage to `memoryStorage()` (need `file.buffer` for S3). Add `@HttpCode(HttpStatus.CREATED)`.
- `app.module.ts` — import `DocumentFileModule`, `ExtractedDocumentQueueModule`, `StorageModule` (so `S3Service` resolvable project-wide; optional since facade imports it directly, but cleaner global). Remove old `forFeature` of deprecated entities? (out of scope; leave).

### multer
- `FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: 20MB } })` — `import { memoryStorage } from "multer"`.

## Transaction boundary
- Use `@Injectable() DataSource` injection in facade (or service layer). Wrap steps 3–4 (S3 + 2 DB writes) in `dataSource.transaction(...)`. Risk: S3 upload inside TX holds DB lock longer; acceptable for now. If S3 fails, TX rolls back DB writes (file orphaned in S3 — manual cleanup later, acceptable). Decision: keep simple, single TX for the two DB writes; S3 outside TX or inside — **Decision point C**.

## Decisions needed (before code)
- **A:** OCR — A1 (client chunks) or A2 (server OCR provider)?
- **B:** Where do `create` methods live — service layer or repository layer? (recommend: repository stays thin, service owns `create` to match Nest idioms + existing `DocumentFileService`/`DocumentFileRepository` pairing).
- **C:** S3 upload inside TX or outside? (recommend: outside — upload first, then TX the 2 DB writes; if DB fails, delete S3 object).

## Out of scope (explicitly later)
- Admin review UI over `extracted_document_queues` (parse `extracted_data` jsonb, set ACCEPT/REVIEW/INVALID).
- `ACCEPT` decision gating (e.g., push to `incoming_documents`).
- Server-side OCR (if A2 not chosen now, deferred).
- Old commented `upload.controller.ts` removal (leave until new flow proven).
