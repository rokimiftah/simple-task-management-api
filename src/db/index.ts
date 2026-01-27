import { Database } from "bun:sqlite";

import path from "node:path";

const dbPath = path.join(process.cwd(), "tasks.db");

export const db = new Database(dbPath);

db.run("PRAGMA journal_mode = WAL;");
db.run("PRAGMA synchronous = 1;");
db.run("PRAGMA journal_size_limit = 67108864;");
db.run("PRAGMA mmap_size = 134217728;");
db.run("PRAGMA cache_size = 2000;");
db.run("PRAGMA busy_timeout = 5000;");
db.run("PRAGMA foreign_keys = ON;");

export default db;
