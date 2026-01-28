import { getDb } from "../src/db/index";
import { initializeDatabase } from "../src/db/schema";
import { loggerMiddleware } from "../src/middleware/logger";
import { authRoutes } from "../src/routes/auth";
import { taskRoutes } from "../src/routes/tasks";
import { treaty } from "@elysiajs/eden";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Elysia } from "elysia";

describe("API Integration Tests", () => {
  let api: ReturnType<typeof treaty>;
  let authToken: string;
  let _userId: number;
  const testUser = {
    name: "Test User",
    email: "test@example.com",
    password: "password123"
  };

  beforeAll(async () => {
    initializeDatabase();
    const db = getDb();

    db.prepare("DELETE FROM tasks").run();
    db.prepare("DELETE FROM users").run();

    const app = new Elysia().use(loggerMiddleware).use(authRoutes).use(taskRoutes);

    api = treaty(app);

    const registerResponse = await api.auth.register.post(testUser);
    if (registerResponse.error) {
      throw new Error(`Failed to create test user: ${registerResponse.error.message}`);
    }

    const loginResponse = await api.auth.login.post({
      email: testUser.email,
      password: testUser.password
    });
    if (loginResponse.error || !loginResponse.data?.token) {
      throw new Error(`Failed to login test user: ${loginResponse.error?.message || "No token received"}`);
    }

    authToken = loginResponse.data.token;
    _userId = loginResponse.data.user.id;
  });

  afterAll(() => {
    const db = getDb();
    db.close();
  });

  afterAll(() => {
    const db = getDb();
    db.close();
  });

  describe("User Registration", () => {
    test("POST /auth/register - creates user successfully", async () => {
      const { data, error } = await api.auth.register.post({
        name: "Another User",
        email: "another@example.com",
        password: "password456"
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.email).toBe("another@example.com");
      expect(data?.name).toBe("Another User");
      expect(data?.id).toBeNumber();
    });
  });

  describe("User Login", () => {
    test("POST /auth/login - returns token successfully", async () => {
      const { data, error } = await api.auth.login.post({
        email: testUser.email,
        password: testUser.password
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.token).toBeString();
      expect(data?.user).toBeDefined();
      expect(data?.user.email).toBe(testUser.email);
      expect(data?.user.name).toBe(testUser.name);
    });
  });

  describe("GET /tasks with pagination", () => {
    beforeAll(async () => {
      for (let i = 1; i <= 15; i++) {
        await api.tasks.post(
          {
            title: `Task ${i}`,
            description: `Description for task ${i}`,
            status: i % 2 === 0 ? "done" : "pending"
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
      }
    });

    test("returns default pagination (page=1, limit=10)", async () => {
      const { data, error } = await api.tasks.get({
        query: {},
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.data).toBeArray();
      expect(data?.data).toHaveLength(10);
      expect(data?.pagination).toBeDefined();
      expect(data?.pagination.page).toBe(1);
      expect(data?.pagination.limit).toBe(10);
      expect(data?.pagination.total).toBe(15);
      expect(data?.pagination.totalPages).toBe(2);
      expect(data?.pagination.hasNext).toBe(true);
      expect(data?.pagination.hasPrev).toBe(false);
    });

    test("returns second page (page=2, limit=10)", async () => {
      const { data, error } = await api.tasks.get({
        query: { page: "2", limit: "10" },
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.data).toBeArray();
      expect(data?.data).toHaveLength(5);
      expect(data?.pagination.page).toBe(2);
      expect(data?.pagination.limit).toBe(10);
      expect(data?.pagination.total).toBe(15);
      expect(data?.pagination.totalPages).toBe(2);
      expect(data?.pagination.hasNext).toBe(false);
      expect(data?.pagination.hasPrev).toBe(true);
    });

    test("returns custom limit (limit=5)", async () => {
      const { data, error } = await api.tasks.get({
        query: { limit: "5" },
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.data).toBeArray();
      expect(data?.data).toHaveLength(5);
      expect(data?.pagination.page).toBe(1);
      expect(data?.pagination.limit).toBe(5);
      expect(data?.pagination.total).toBe(15);
      expect(data?.pagination.totalPages).toBe(3);
      expect(data?.pagination.hasNext).toBe(true);
      expect(data?.pagination.hasPrev).toBe(false);
    });
  });

  describe("DELETE /tasks (soft delete)", () => {
    let taskId: number;

    beforeAll(async () => {
      const { data } = await api.tasks.post(
        {
          title: "Task to delete",
          description: "This task will be soft deleted",
          status: "pending"
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      taskId = data?.id as number;
    });

    test("soft deletes task successfully", async () => {
      const { data, error } = await api.tasks({ id: taskId.toString() }).delete(undefined, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(error).toBeNull();
      expect(data?.message).toBe("Task deleted successfully");
    });

    test("GET /tasks/:id returns 404 for soft deleted task", async () => {
      const { error } = await api.tasks({ id: taskId.toString() }).get({
        query: undefined,
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(error).toBeDefined();
    });

    test("task not in list after soft delete", async () => {
      const { data, error } = await api.tasks.get({
        query: {},
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(error).toBeNull();
      expect(data?.data).toBeArray();
      expect(data?.data.find((t: { id: number }) => t?.id === taskId)).toBeUndefined();
    });
  });
});
