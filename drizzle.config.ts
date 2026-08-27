import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://oriel:oriel_dev_password@127.0.0.1:5432/oriel",
  },
  strict: true,
  verbose: true,
});
