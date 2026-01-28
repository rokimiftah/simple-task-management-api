import { getDb, resetDb } from "../db";
import { authQueries } from "../db/queries";
import { initializeDatabase } from "../db/schema";
import { generateToken } from "../middleware/auth";
import { taskRoutes } from "../routes/tasks";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Elysia } from "elysia";

describe("GET /tasks with pagination", () => {
  let testUserId: number;
  let authToken: string;

  beforeAll(() => {
    process.env.DATABASE_PATH = ":memory:";
    resetDb();
    initializeDatabase();

    const hashedPassword = "$2b$10$testHashedPasswordForTesting";
    const user = authQueries.createUser({
      name: "Test User",
      email: "pagination@test.com",
      password: hashedPassword
    });
    testUserId = user.lastInsertRowid as number;
    authToken = generateToken(testUserId);

    const db = getDb();
    for (let i = 1; i <= 25; i++) {
      db.prepare("INSERT INTO tasks (title, description, status, user_id) VALUES (?, ?, ?, ?)").run(
        `Task ${i}`,
        `Description ${i}`,
        i % 2 === 0 ? "done" : "pending",
        testUserId
      );
    }
  });

  afterAll(() => {
    const db = getDb();
    db.prepare("DELETE FROM tasks WHERE user_id = ?").run(testUserId);
    db.prepare("DELETE FROM users WHERE id = ?").run(testUserId);
  });

  test("returns paginated response with default page 1 and limit 10", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/api/tasks", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
    );

    const data = await response.json();

    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("pagination");
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBe(10);
    expect(data.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: false
    });
  });

  test("returns second page with 10 items", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/api/tasks?page=2&limit=10", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
    );

    const data = await response.json();

    expect(data.data.length).toBe(10);
    expect(data.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: true
    });
  });

  test("returns last page with remaining items", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/api/tasks?page=3&limit=10", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
    );

    const data = await response.json();

    expect(data.data.length).toBe(5);
    expect(data.pagination).toEqual({
      page: 3,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: false,
      hasPrev: true
    });
  });

  test("validates page parameter with minimum value 1", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/api/tasks?page=0&limit=10", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
    );

    expect(response.status).toBe(422);
  });

  test("validates limit parameter with minimum value 1", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/api/tasks?page=1&limit=0", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
    );

    expect(response.status).toBe(422);
  });

  test("validates limit parameter with maximum value 100", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/api/tasks?page=1&limit=101", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
    );

    expect(response.status).toBe(422);
  });

  test("accepts valid limit of 100", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/api/tasks?page=1&limit=100", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
    );

    const data = await response.json();

    expect(data.data.length).toBe(25);
    expect(data.pagination.limit).toBe(100);
  });
});
