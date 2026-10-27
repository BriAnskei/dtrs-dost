import { S3Client } from "@aws-sdk/client-s3";
import { ConfigService } from "@nestjs/config";

export function createS3Client(config: ConfigService): S3Client {
  const cfg = {
    S3_REGION: config.get<string>("S3_REGION"),
    S3_ENDPOINT: config.get<string>("S3_ENDPOINT"),
    S3_FORCE_PATH_STYLE: config.get<string>("S3_FORCE_PATH_STYLE"),
    S3_ACCESS_KEY_ID: config.get<string>("S3_ACCESS_KEY_ID"),
    S3_SECRET_ACCESS_KEY: config.get<string>("S3_SECRET_ACCESS_KEY"),
    S3_BUCKET: config.get<string>("S3_BUCKET"),
  };
  try {
    return new S3Client({
      region: config.getOrThrow<string>("S3_REGION"),
      endpoint: config.get<string>("S3_ENDPOINT") || undefined,
      forcePathStyle: config.get<string>("S3_FORCE_PATH_STYLE") === "true",
      credentials: {
        accessKeyId: config.getOrThrow<string>("S3_ACCESS_KEY_ID"),
        secretAccessKey: config.getOrThrow<string>("S3_SECRET_ACCESS_KEY"),
      },
    });
  } catch (e) {
    console.error("[S3] createS3Client FAILED:", (e as Error)?.message ?? e);
    throw e;
  }
}
