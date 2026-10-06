import { plainToInstance, Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
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
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ReceiverChunkDto)
  chunks!: ReceiverChunkDto[];
}
