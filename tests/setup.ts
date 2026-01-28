import db, { resetDb } from "../src/db/index";
import { initializeDatabase } from "../src/db/schema";

export function setupTestDatabase() {
  const testDbPath = ":memory:";
  process.env.DATABASE_PATH = testDbPath;
  resetDb();

  initializeDatabase();
}

export function cleanupTestDatabase() {
  db.close();
}
