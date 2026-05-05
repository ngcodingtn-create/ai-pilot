import { neon } from "@neondatabase/serverless";

let cachedDatabaseUrl = "";
let cachedSql: ReturnType<typeof neon> | null = null;

export function getSql() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    return null;
  }

  if (cachedSql && cachedDatabaseUrl === url) {
    return cachedSql;
  }

  cachedDatabaseUrl = url;
  cachedSql = neon(url);
  return cachedSql;
}
