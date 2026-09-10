import { NestFactory } from "@nestjs/core";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { AppModule } from "./app.module";
import { withAuth } from "./middleware/auth";
import { withRateLimit } from "./middleware/rateLimit";

dotenvConfig({ path: resolve(process.cwd(), ".env") });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  });
  app.use("/ai/extract", withRateLimit);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
