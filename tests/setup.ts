import db from "../src/db/index";
import { initializeDatabase } from "../src/db/schema";

export function setupTestDatabase() {
  const testDbPath = ":memory:";
  process.env.DATABASE_PATH = testDbPath;

  initializeDatabase();
}

export function cleanupTestDatabase() {
  db.close();
}
