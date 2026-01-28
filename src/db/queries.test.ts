import db from "./index";
import { authQueries, taskQueries } from "./queries";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { CreateTaskInput } from "../types";

describe("taskQueries", () => {
  let testUserId: number;
  let taskId1: number;
  let _taskId2: number;
  let _taskId3: number;
  let deletedTaskId: number;

  beforeEach(() => {
    const user = authQueries.createUser({ name: "Test User", email: `test-${Date.now()}@example.com`, password: "password" });
    testUserId = user.lastInsertRowid as number;

    const createTask = (input: CreateTaskInput) => {
      const result = taskQueries.createTask({ ...input, userId: testUserId });
      return result.lastInsertRowid as number;
    };

    taskId1 = createTask({ title: "Task 1", status: "pending" });
    _taskId2 = createTask({ title: "Task 2", status: "done" });
    _taskId3 = createTask({ title: "Task 3", status: "pending" });
    deletedTaskId = createTask({ title: "Deleted Task", status: "pending" });

    taskQueries.deleteTask(deletedTaskId, testUserId);
  });

  afterEach(() => {
    db.prepare("DELETE FROM tasks WHERE user_id = ?").run(testUserId);
    db.prepare("DELETE FROM users WHERE id = ?").run(testUserId);
  });

  describe("findAllTasks", () => {
    test("returns paginated tasks excluding soft-deleted", () => {
      const tasks = taskQueries.findAllTasks(testUserId, 1, 2);

      expect(tasks).toHaveLength(2);
      expect(tasks.every((t) => t.deleted_at === null)).toBe(true);
      expect(tasks.find((t) => t.id === deletedTaskId)).toBeUndefined();
    });

    test("returns correct page data with offset", () => {
      const page1 = taskQueries.findAllTasks(testUserId, 1, 2);
      const page2 = taskQueries.findAllTasks(testUserId, 2, 2);

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
      expect(page1.map((t) => t.id)).not.toEqual(page2.map((t) => t.id));
    });

    test("includes deleted_at in returned tasks", () => {
      const tasks = taskQueries.findAllTasks(testUserId, 1, 10);
      expect(tasks.every((t) => "deleted_at" in t)).toBe(true);
    });
  });

  describe("countTasks", () => {
    test("returns count of non-deleted tasks", () => {
      const count = taskQueries.countTasks(testUserId);
      expect(count).toBe(3);
    });

    test("returns 0 for user with no tasks", () => {
      const count = taskQueries.countTasks(99999);
      expect(count).toBe(0);
    });
  });

  describe("deleteTask", () => {
    test("soft deletes task by setting deleted_at", () => {
      const result = taskQueries.deleteTask(taskId1, testUserId);

      expect(result.changes).toBe(1);

      const task = taskQueries.findTaskById(taskId1, testUserId);
      expect(task).toBeDefined();
      expect(task?.deleted_at).not.toBeNull();
    });

    test("does not delete task from database", () => {
      taskQueries.deleteTask(taskId1, testUserId);

      const stmt = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE id = ?");
      const result = stmt.get(taskId1) as { count: number };
      expect(result.count).toBe(1);
    });

    test("returns 0 changes for non-existent task", () => {
      const result = taskQueries.deleteTask(99999, testUserId);
      expect(result.changes).toBe(0);
    });
  });

  describe("findTaskById", () => {
    test("includes deleted_at in returned task", () => {
      const task = taskQueries.findTaskById(taskId1, testUserId);
      expect(task).toBeDefined();
      expect(task?.deleted_at).toBeNull();
    });
  });
});
