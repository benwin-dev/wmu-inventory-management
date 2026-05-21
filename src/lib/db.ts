import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __inventoryDbPool: Pool | undefined;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return databaseUrl;
}

export function getDbPool() {
  if (!global.__inventoryDbPool) {
    global.__inventoryDbPool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: { rejectUnauthorized: false },
    });
  }

  return global.__inventoryDbPool;
}
