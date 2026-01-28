import { initializeDatabase } from "../src/db/schema";
import { Database } from "bun:sqlite";

let testDb: Database | null = null;

export function setupTestDatabase(): void {
  process.env.DATABASE_PATH = ":memory:";
  testDb = new Database(":memory:");
  testDb.run("PRAGMA journal_mode = WAL;");
  testDb.run("PRAGMA synchronous = 1;");
  testDb.run("PRAGMA foreign_keys = ON;");
  initializeDatabase();
}

export function cleanupTestDatabase(): void {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
}
