import db from "../src/db/index";
import { taskQueries } from "../src/db/queries";
import { initializeDatabase } from "../src/db/schema";
import { loggerMiddleware } from "../src/middleware/logger";
import { authRoutes } from "../src/routes/auth";
import { taskRoutes } from "../src/routes/tasks";
import { Elysia } from "elysia";

describe("API Integration Tests", () => {
  let app: Elysia;
  let authToken: string;
  let userId: number;

  beforeAll(() => {
    initializeDatabase();

    db.prepare("DELETE FROM tasks").run();
    db.prepare("DELETE FROM users").run();

    app = new Elysia().use(loggerMiddleware).use(authRoutes).use(taskRoutes);
  });

  afterAll(() => {
    db.close();
  });

  describe("User Registration", () => {
    test("POST /api/auth/register - creates user successfully", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test User",
            email: "test@example.com",
            password: "password123"
          })
        })
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.email).toBe("test@example.com");
      expect(data.name).toBe("Test User");
      expect(data.id).toBeNumber();
    });
  });

  describe("User Login", () => {
    test("POST /api/auth/login - returns token successfully", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123"
          })
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.token).toBeString();
      expect(data.user).toBeDefined();
      expect(data.user.id).toBeNumber();

      authToken = data.token;
      userId = data.user.id;
    });
  });

  describe("GET /tasks with pagination", () => {
    beforeAll(() => {
      for (let i = 1; i <= 15; i++) {
        taskQueries.createTask({
          userId,
          title: `Task ${i}`,
          description: `Description for task ${i}`,
          status: i % 2 === 0 ? "done" : "pending"
        });
      }
    });

    test("returns default pagination (page=1, limit=10)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/tasks", {
          headers: { authorization: `Bearer ${authToken}` }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toBeArray();
      expect(data.data).toHaveLength(10);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.total).toBe(15);
      expect(data.pagination.totalPages).toBe(2);
      expect(data.pagination.hasNext).toBe(true);
      expect(data.pagination.hasPrev).toBe(false);
    });

    test("returns second page (page=2, limit=10)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/tasks?page=2&limit=10", {
          headers: { authorization: `Bearer ${authToken}` }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toBeArray();
      expect(data.data).toHaveLength(5);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.total).toBe(15);
      expect(data.pagination.totalPages).toBe(2);
      expect(data.pagination.hasNext).toBe(false);
      expect(data.pagination.hasPrev).toBe(true);
    });

    test("returns custom limit (limit=5)", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/tasks?limit=5", {
          headers: { authorization: `Bearer ${authToken}` }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toBeArray();
      expect(data.data).toHaveLength(5);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(5);
      expect(data.pagination.total).toBe(15);
      expect(data.pagination.totalPages).toBe(3);
      expect(data.pagination.hasNext).toBe(true);
      expect(data.pagination.hasPrev).toBe(false);
    });
  });

  describe("DELETE /tasks (soft delete)", () => {
    let taskId: number;

    beforeAll(() => {
      const result = taskQueries.createTask({
        userId,
        title: "Task to delete",
        description: "This task will be soft deleted",
        status: "pending"
      });
      taskId = result.lastInsertRowid;
    });

    test("soft deletes task successfully", async () => {
      const response = await app.handle(
        new Request(`http://localhost/api/tasks/${taskId}`, {
          method: "DELETE",
          headers: { authorization: `Bearer ${authToken}` }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Task deleted successfully");
    });

    test("GET /tasks/:id returns 404 for soft deleted task", async () => {
      const response = await app.handle(
        new Request(`http://localhost/api/tasks/${taskId}`, {
          headers: { authorization: `Bearer ${authToken}` }
        })
      );

      expect(response.status).toBe(404);
    });

    test("task not in list after soft delete", async () => {
      const response = await app.handle(
        new Request("http://localhost/api/tasks", {
          headers: { authorization: `Bearer ${authToken}` }
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toBeArray();
      expect(data.pagination.total).toBe(15);
      expect(data.data.find((t) => t?.id === taskId)).toBeUndefined();
    });
  });
});
