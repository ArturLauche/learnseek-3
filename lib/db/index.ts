import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://oriel:oriel_dev_password@127.0.0.1:5432/oriel";

const globalForDb = globalThis as unknown as {
  postgres?: ReturnType<typeof postgres>;
};

export const client =
  globalForDb.postgres ??
  postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 10 : 4,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.postgres = client;
}

export const db = drizzle(client, { schema });
export type Database = typeof db;
