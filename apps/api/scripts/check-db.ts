import postgres from "postgres";

const url = Bun.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not configured");
  process.exit(1);
}

const sql = postgres(url, { max: 1, connect_timeout: 5 });
try {
  await sql`select 1 as ok`;
  console.log("PostgreSQL reachable");
} finally {
  await sql.end();
}
