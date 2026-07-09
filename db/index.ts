import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

function createDb() {
  const connectionString =
    process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL;

  if (!connectionString) {
    throw new Error("POSTGRES_URL or POSTGRES_PRISMA_URL is required.");
  }

  const client = postgres(connectionString, {
    prepare: false,
    ssl: "require",
  });

  return drizzle(client, { schema });
}

let database: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!database) database = createDb();
  return database;
}
