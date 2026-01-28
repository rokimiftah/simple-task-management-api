import { cleanupTestDatabase, setupTestDatabase } from "./setup";
import { describe, expect, test } from "bun:test";

describe("Test Setup Utilities", () => {
  test("setupTestDatabase should initialize in-memory database", () => {
    setupTestDatabase();

    expect(process.env.DATABASE_PATH).toBe(":memory:");
  });

  test("cleanupTestDatabase should close database connection", () => {
    setupTestDatabase();
    cleanupTestDatabase();

    expect(() => cleanupTestDatabase()).not.toThrow();
  });
});
