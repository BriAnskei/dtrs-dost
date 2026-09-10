import type { ConfigService } from "@nestjs/config";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";

export const getDatabaseConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type: "postgres",
  url: config.get<string>("DATABASE_URL"),
  autoLoadEntities: true,
  synchronize: process.env.NODE_ENV !== "production",
  logging: process.env.NODE_ENV !== "production",
});
