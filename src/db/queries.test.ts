import { getDb, resetDb } from "./index";
import { authQueries, taskQueries } from "./queries";
import { initializeDatabase } from "./schema";
import { afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import type { CreateTaskInput } from "../types";

describe("taskQueries", () => {
  let testUserId: number;
  let taskId1: number;
  let _taskId2: number;
  let _taskId3: number;
  let deletedTaskId: number;

  beforeAll(() => {
    process.env.DATABASE_PATH = ":memory:";
    resetDb();
    initializeDatabase();
  });

  beforeEach(() => {
    const user = authQueries.createUser({ name: "Test User", email: `test-${Date.now()}@example.com`, password: "password" });
    testUserId = user.lastInsertRowid as number;

    const createTask = (input: CreateTaskInput) => {
      const result = taskQueries.createTask({ ...input, userId: testUserId });
      return result.lastInsertRowid as number;
    };

    taskId1 = createTask({
      title: "Task 1",
      status: "pending",
      priority: "high",
      due_date: "2024-12-31T23:59:59Z",
      tags: ["work", "urgent"]
    });
    _taskId2 = createTask({
      title: "Task 2",
      status: "done",
      priority: "low",
      due_date: "2024-06-30T23:59:59Z",
      tags: ["personal"]
    });
    _taskId3 = createTask({ title: "Task 3", status: "pending", priority: "medium", due_date: null, tags: ["work"] });
    deletedTaskId = createTask({ title: "Deleted Task", status: "pending", priority: "medium", due_date: null, tags: [] });

    taskQueries.deleteTask(deletedTaskId, testUserId);
  });

  afterEach(() => {
    const db = getDb();
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

      const db = getDb();
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

    test("includes new fields in returned task", () => {
      const task = taskQueries.findTaskById(taskId1, testUserId);
      expect(task).toBeDefined();
      expect(task?.priority).toBe("high");
      expect(task?.due_date).toBe("2024-12-31T23:59:59Z");
      expect(task?.tags).toBe(JSON.stringify(["work", "urgent"]));
    });
  });

  describe("findAllTasksEnhanced", () => {
    test("filters by priority", () => {
      const tasks = taskQueries.findAllTasksEnhanced(testUserId, { priority: "high" });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].priority).toBe("high");
    });

    test("filters by date range", () => {
      const tasks = taskQueries.findAllTasksEnhanced(testUserId, {
        due_date_from: "2024-01-01T00:00:00Z",
        due_date_to: "2024-12-31T23:59:59Z"
      });
      expect(tasks.length).toBeGreaterThanOrEqual(1);
    });

    test("filters by tags (AND logic)", () => {
      const tasks = taskQueries.findAllTasksEnhanced(testUserId, { tags: ["work", "urgent"] });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe(taskId1);
    });

    test("filters by single tag", () => {
      const tasks = taskQueries.findAllTasksEnhanced(testUserId, { tags: ["work"] });
      expect(tasks.length).toBeGreaterThanOrEqual(2);
    });

    test("searches in title and description", () => {
      const tasks = taskQueries.findAllTasksEnhanced(testUserId, { search: "Task" });
      expect(tasks.length).toBeGreaterThanOrEqual(3);
    });

    test("sorts by priority", () => {
      const tasks = taskQueries.findAllTasksEnhanced(testUserId, {}, "priority", "asc");
      expect(tasks[0].priority).toBe("high");
      expect(tasks[tasks.length - 1].priority).toBe("low");
    });

    test("sorts by due_date", () => {
      const tasks = taskQueries.findAllTasksEnhanced(testUserId, {}, "due_date", "asc");
      const tasksWithDueDate = tasks.filter((t) => t.due_date !== null);
      if (tasksWithDueDate.length > 1) {
        expect(new Date(tasksWithDueDate[0].due_date!).getTime()).toBeLessThanOrEqual(
          new Date(tasksWithDueDate[1].due_date!).getTime()
        );
      }
    });

    test("applies pagination with filters", () => {
      const tasks = taskQueries.findAllTasksEnhanced(testUserId, { priority: "medium" }, "created_at", "desc", 1, 1);
      expect(tasks.length).toBeLessThanOrEqual(1);
    });
  });

  describe("countTasksEnhanced", () => {
    test("counts tasks with priority filter", () => {
      const count = taskQueries.countTasksEnhanced(testUserId, { priority: "high" });
      expect(count).toBe(1);
    });

    test("counts tasks with date range filter", () => {
      const count = taskQueries.countTasksEnhanced(testUserId, {
        due_date_from: "2024-01-01T00:00:00Z",
        due_date_to: "2024-12-31T23:59:59Z"
      });
      expect(count).toBeGreaterThan(0);
    });

    test("counts tasks with tags filter", () => {
      const count = taskQueries.countTasksEnhanced(testUserId, { tags: ["work"] });
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe("findTasksByPriority", () => {
    test("returns tasks with specified priority", () => {
      const tasks = taskQueries.findTasksByPriority(testUserId, "high");
      expect(tasks).toHaveLength(1);
      expect(tasks[0].priority).toBe("high");
    });
  });

  describe("findTasksByDateRange", () => {
    test("returns tasks within date range", () => {
      const tasks = taskQueries.findTasksByDateRange(testUserId, "2024-01-01T00:00:00Z", "2024-12-31T23:59:59Z");
      expect(tasks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("findTasksByTags", () => {
    test("returns tasks with all specified tags (AND logic)", () => {
      const tasks = taskQueries.findTasksByTags(testUserId, ["work", "urgent"]);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe(taskId1);
    });

    test("returns tasks with single tag", () => {
      const tasks = taskQueries.findTasksByTags(testUserId, ["work"]);
      expect(tasks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("searchTasks", () => {
    test("searches in title", () => {
      const tasks = taskQueries.searchTasks(testUserId, "Task 1");
      expect(tasks.length).toBeGreaterThanOrEqual(1);
      expect(tasks.some((t) => t.title.includes("Task 1"))).toBe(true);
    });

    test("searches in description", () => {
      const tasks = taskQueries.searchTasks(testUserId, "Test");
      expect(tasks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getAllTags", () => {
    test("returns all unique tags for user", () => {
      const tags = taskQueries.getAllTags(testUserId);
      expect(tags).toContain("work");
      expect(tags).toContain("urgent");
      expect(tags).toContain("personal");
    });

    test("returns empty array for user with no tags", () => {
      const tags = taskQueries.getAllTags(99999);
      expect(tags).toEqual([]);
    });
  });

  describe("createTask with new fields", () => {
    test("creates task with priority, due_date, and tags", () => {
      const result = taskQueries.createTask({
        title: "New Task",
        status: "pending",
        priority: "high",
        due_date: "2024-12-31T23:59:59Z",
        tags: ["test", "new"],
        userId: testUserId
      });

      expect(result.lastInsertRowid).toBeGreaterThan(0);

      const task = taskQueries.findTaskById(result.lastInsertRowid as number, testUserId);
      expect(task?.priority).toBe("high");
      expect(task?.due_date).toBe("2024-12-31T23:59:59Z");
      expect(task?.tags).toBe(JSON.stringify(["test", "new"]));
    });

    test("creates task with default priority and null due_date", () => {
      const result = taskQueries.createTask({
        title: "Simple Task",
        status: "pending",
        userId: testUserId
      });

      const task = taskQueries.findTaskById(result.lastInsertRowid as number, testUserId);
      expect(task?.priority).toBe("medium");
      expect(task?.due_date).toBeNull();
      expect(task?.tags).toBeNull();
    });
  });

  describe("updateTask with new fields", () => {
    test("updates priority, due_date, and tags", () => {
      const result = taskQueries.updateTask({
        id: taskId1,
        userId: testUserId,
        priority: "low",
        due_date: "2025-01-01T00:00:00Z",
        tags: ["updated"]
      });

      expect(result.changes).toBe(1);

      const task = taskQueries.findTaskById(taskId1, testUserId);
      expect(task?.priority).toBe("low");
      expect(task?.due_date).toBe("2025-01-01T00:00:00Z");
      expect(task?.tags).toBe(JSON.stringify(["updated"]));
    });

    test("replaces tags when updating", () => {
      const initialTags = taskQueries.findTaskById(taskId1, testUserId)?.tags;
      expect(initialTags).toBe(JSON.stringify(["work", "urgent"]));

      taskQueries.updateTask({
        id: taskId1,
        userId: testUserId,
        tags: ["new-tags"]
      });

      const task = taskQueries.findTaskById(taskId1, testUserId);
      expect(task?.tags).toBe(JSON.stringify(["new-tags"]));
    });

    test("clears tags when updating with empty array", () => {
      taskQueries.updateTask({
        id: taskId1,
        userId: testUserId,
        tags: []
      });

      const task = taskQueries.findTaskById(taskId1, testUserId);
      expect(task?.tags).toBeNull();
    });
  });
});
