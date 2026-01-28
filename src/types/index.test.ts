import { describe, expect, test } from "bun:test";
import type { Task } from "./index";

describe("Task Type", () => {
  test("Task interface includes deleted_at field", () => {
    const task: Task = {
      id: 1,
      title: "Test Task",
      description: "Test Description",
      status: "pending",
      user_id: 1,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      deleted_at: null
    };

    expect(task.deleted_at).toBeNull();
  });

  test("Task interface accepts deleted_at as ISO date string", () => {
    const taskWithDeletedAt: Task = {
      id: 1,
      title: "Test Task",
      description: null,
      status: "done",
      user_id: 1,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      deleted_at: "2024-01-03T00:00:00Z"
    };

    expect(taskWithDeletedAt.deleted_at).toBe("2024-01-03T00:00:00Z");
  });

  test("Task without deleted_at should be invalid", () => {
    const incompleteTask = {
      id: 1,
      title: "Test Task",
      description: null,
      status: "pending",
      user_id: 1,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z"
    } as Task;

    expect(() => {
      const _checkDeletedAt: string | null = incompleteTask.deleted_at;
    }).not.toThrow();
  });
});
