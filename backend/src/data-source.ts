import "dotenv/config";
import { DataSource } from "typeorm";
import { RefreshTokenEntity } from "./auth/authentication/entities/refresh-token.entityntity";

export default new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,

  entities: [RefreshTokenEntity],

  migrations: ["src/migrations/*.ts"],
});
