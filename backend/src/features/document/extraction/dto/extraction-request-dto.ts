import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import type { DocumentDirection } from "../contants/document-direction";
import { DOCUMENT_DIRECTIONS } from "../contants/document-direction";

export class ExtractionChunkDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  chunkId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20_000)
  text!: string;
}

export class ExtractionRequestDto {
  @IsIn([...DOCUMENT_DIRECTIONS])
  documentType!: DocumentDirection;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ExtractionChunkDto)
  chunks!: ExtractionChunkDto[];
}
