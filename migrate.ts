import { getDb } from "./src/db";

export function migrate(): void {
  const db = getDb();

  console.log("Checking database schema...");

  const tableInfo = db.prepare("PRAGMA table_info(tasks)").all() as Array<{
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: string | null;
    pk: number;
  }>;

  const hasDeletedAt = tableInfo.some((column) => column.name === "deleted_at");

  if (hasDeletedAt) {
    console.log("Column 'deleted_at' already exists in tasks table. Skipping migration.");
    return;
  }

  console.log("Column 'deleted_at' not found. Adding it to tasks table...");

  db.exec("ALTER TABLE tasks ADD COLUMN deleted_at DATETIME;");

  console.log("Migration completed successfully!");
}

migrate();
