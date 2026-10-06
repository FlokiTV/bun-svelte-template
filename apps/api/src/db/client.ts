import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../config";

let client: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof drizzle> | undefined;

function requireDatabaseUrl(): string {
  if (!config.databaseUrl) throw new Error("DATABASE_URL is not configured");
  return config.databaseUrl;
}

export function getSqlClient() {
  if (!client) {
    client = postgres(requireDatabaseUrl(), {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return client;
}

export function getDb() {
  database ??= drizzle(getSqlClient());
  return database;
}

export async function pingDb(): Promise<void> {
  const sql = getSqlClient();
  await sql`select 1 as ok`;
}

export async function closeDb(): Promise<void> {
  if (client) await client.end();
  client = undefined;
  database = undefined;
}
