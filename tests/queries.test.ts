import { getDb, resetDb } from "../src/db/index";
import { authQueries, taskQueries } from "../src/db/queries";
import { initializeDatabase } from "../src/db/schema";
import { afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";

describe("Queries", () => {
  let testUserId: number;

  beforeAll(() => {
    process.env.DATABASE_PATH = ":memory:";
    resetDb();
    initializeDatabase();
  });

  beforeEach(() => {
    const user = authQueries.createUser({ name: "Test User", email: `test-${Date.now()}@example.com`, password: "password" });
    testUserId = user.lastInsertRowid as number;
  });

  afterEach(() => {
    const db = getDb();
    db.prepare("DELETE FROM tasks WHERE user_id = ?").run(testUserId);
    db.prepare("DELETE FROM users WHERE id = ?").run(testUserId);
  });

  describe("createTask", () => {
    test("creates task with valid lastInsertRowid and changes", () => {
      const result = taskQueries.createTask({ title: "Test Task", status: "pending", userId: testUserId });

      expect(result.lastInsertRowid).toBeGreaterThan(0);
      expect(result.changes).toBe(1);
    });
  });

  describe("findAllTasks", () => {
    test("returns empty array when no tasks exist", () => {
      const tasks = taskQueries.findAllTasks(testUserId, 1, 10);

      expect(tasks).toEqual([]);
    });

    test("returns paginated tasks correctly", () => {
      for (let i = 1; i <= 15; i++) {
        taskQueries.createTask({ title: `Task ${i}`, status: "pending", userId: testUserId });
      }

      const page1 = taskQueries.findAllTasks(testUserId, 1, 10);
      const page2 = taskQueries.findAllTasks(testUserId, 2, 10);

      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(5);
    });
  });

  describe("countTasks", () => {
    test("returns correct count of tasks", () => {
      for (let i = 1; i <= 5; i++) {
        taskQueries.createTask({ title: `Task ${i}`, status: "pending", userId: testUserId });
      }

      const count = taskQueries.countTasks(testUserId);

      expect(count).toBe(5);
    });
  });

  describe("deleteTask (soft delete)", () => {
    test("excludes soft-deleted task from findAllTasks", () => {
      const result = taskQueries.createTask({ title: "Task to Delete", status: "pending", userId: testUserId });
      const taskId = result.lastInsertRowid as number;

      taskQueries.deleteTask(taskId, testUserId);

      const tasks = taskQueries.findAllTasks(testUserId, 1, 10);

      expect(tasks).toEqual([]);
    });
  });
});
