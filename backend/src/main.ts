import { resolve } from "node:path";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { config as dotenvConfig } from "dotenv";
import { AppModule } from "./app.module";
import { withRateLimit } from "./middleware/rateLimit";

dotenvConfig({ path: resolve(process.cwd(), ".env") });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.use("/ai/extract", withRateLimit);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
