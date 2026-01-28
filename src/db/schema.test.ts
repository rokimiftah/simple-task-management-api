import db from "../db/index";
import { initializeDatabase } from "../db/schema";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

describe("Database Schema", () => {
  beforeAll(() => {
    db.run("DROP TABLE IF EXISTS tasks");
    db.run("DROP TABLE IF EXISTS users");
    initializeDatabase();
  });

  afterAll(() => {
    db.close();
  });

  test("tasks table should have deleted_at column", () => {
    const columns = db.prepare("PRAGMA table_info(tasks)").all() as Array<{
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }>;

    const deletedAtColumn = columns.find((col) => col.name === "deleted_at");

    expect(deletedAtColumn).toBeDefined();
    expect(deletedAtColumn?.type).toBe("DATETIME");
    expect(deletedAtColumn?.notnull).toBe(0);
  });
});
