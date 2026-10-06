import postgres from "postgres";

const databaseUrl = Bun.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/vibe";
const requiredRoles = ["anon", "authenticated"] as const;
const sql = postgres(databaseUrl, { max: 1, connect_timeout: 5 });

try {
  const existing = await sql<Array<{ rolname: string }>>`
    select rolname
    from pg_roles
    where rolname in ('anon', 'authenticated')
  `;
  const existingNames = new Set(existing.map((row) => row.rolname));

  for (const role of requiredRoles) {
    if (existingNames.has(role)) continue;

    try {
      await sql.unsafe(`create role "${role}" nologin`);
      console.log(`Created migration compatibility role: ${role}`);
    } catch (error) {
      throw new Error(
        `PostgreSQL role "${role}" is required by the initial security migration and could not be created. Run migrations with a role that can CREATE ROLE, or pre-create "${role}" as NOLOGIN.`,
        { cause: error },
      );
    }
  }
} finally {
  await sql.end();
}
