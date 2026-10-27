import { plainToInstance, Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class ChunkBBoxDto {
  @IsNumber() @Min(0) @Max(1) x!: number;
  @IsNumber() @Min(0) @Max(1) y!: number;
  @IsNumber() @Min(0) @Max(1) w!: number;
  @IsNumber() @Min(0) @Max(1) h!: number;
}

export class ChunkTokenDto {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @ValidateNested()
  @Type(() => ChunkBBoxDto)
  bbox!: ChunkBBoxDto;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;
}

export class ReceiverChunkDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  chunkId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20_000)
  text!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  sourceConfidence!: number;

  @IsInt()
  @Min(1)
  page!: number;

  @ValidateNested()
  @Type(() => ChunkBBoxDto)
  bbox!: ChunkBBoxDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChunkTokenDto)
  tokens?: ChunkTokenDto[];
}

export class CreateExtractedDocumentDto {
  // multipart/form-data sends `chunks` as a JSON string.
  // class-transformer runs @Type before @Transform, so it can't
  // deserialize the string into ReceiverChunkDto. We parse and
  // instantiate here so that class-validator's whitelist sees
  // real ReceiverChunkDto instances, not plain objects.
  @Transform(({ value }) => {
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return plainToInstance(ReceiverChunkDto, parsed, {
            enableImplicitConversion: true,
          });
        }
        return parsed;
      } catch {
        return value;
      }
    }
    if (Array.isArray(value)) {
      return plainToInstance(ReceiverChunkDto, value, {
        enableImplicitConversion: true,
      });
    }
    return value;
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => ReceiverChunkDto)
  chunks!: ReceiverChunkDto[];
}
