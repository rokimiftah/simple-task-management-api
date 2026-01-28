import { Database } from "bun:sqlite";

import path from "node:path";

let dbInstance: Database | null = null;

export function getDb(): Database {
  if (dbInstance === null) {
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "tasks.db");
    dbInstance = new Database(dbPath);
    dbInstance.run("PRAGMA journal_mode = WAL;");
    dbInstance.run("PRAGMA synchronous = 1;");
    dbInstance.run("PRAGMA journal_size_limit = 67108864;");
    dbInstance.run("PRAGMA mmap_size = 134217728;");
    dbInstance.run("PRAGMA cache_size = 2000;");
    dbInstance.run("PRAGMA busy_timeout = 5000;");
    dbInstance.run("PRAGMA foreign_keys = ON;");
  }
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance !== null) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function resetDb(): void {
  closeDb();
}

export const db = getDb();

export default db;
