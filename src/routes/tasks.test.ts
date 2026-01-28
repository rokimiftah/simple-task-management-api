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
      new Request("http://localhost/tasks", {
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
      new Request("http://localhost/tasks?page=2&limit=10", {
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
      new Request("http://localhost/tasks?page=3&limit=10", {
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
      new Request("http://localhost/tasks?page=0&limit=10", {
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
      new Request("http://localhost/tasks?page=1&limit=0", {
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
      new Request("http://localhost/tasks?page=1&limit=101", {
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
      new Request("http://localhost/tasks?page=1&limit=100", {
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

describe("POST /tasks with new fields", () => {
  let testUserId: number;
  let authToken: string;

  beforeAll(() => {
    process.env.DATABASE_PATH = ":memory:";
    resetDb();
    initializeDatabase();

    const hashedPassword = "$2b$10$testHashedPasswordForTesting";
    const user = authQueries.createUser({
      name: "Test User",
      email: "newfields@test.com",
      password: hashedPassword
    });
    testUserId = user.lastInsertRowid as number;
    authToken = generateToken(testUserId);
  });

  afterAll(() => {
    const db = getDb();
    db.prepare("DELETE FROM tasks WHERE user_id = ?").run(testUserId);
    db.prepare("DELETE FROM users WHERE id = ?").run(testUserId);
  });

  test("creates task with priority, due_date, and tags", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/tasks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "New Task with Fields",
          description: "Task description",
          status: "pending",
          priority: "high",
          due_date: "2024-12-31T23:59:59Z",
          tags: ["work", "urgent"]
        })
      })
    );

    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.priority).toBe("high");
    expect(data.due_date).toBe("2024-12-31T23:59:59Z");
    expect(data.tags).toBe(JSON.stringify(["work", "urgent"]));
  });

  test("creates task with default priority and null due_date", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/tasks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "Simple Task",
          status: "pending"
        })
      })
    );

    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.priority).toBe("medium");
    expect(data.due_date).toBeNull();
    expect(data.tags).toBeNull();
  });

  test("rejects task with more than 10 tags", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/tasks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "Too Many Tags Task",
          status: "pending",
          tags: ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11"]
        })
      })
    );

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.message).toBe("Maximum 10 tags allowed per task");
  });
});

describe("PUT /tasks with new fields", () => {
  let testUserId: number;
  let authToken: string;
  let taskId: number;

  beforeAll(async () => {
    process.env.DATABASE_PATH = ":memory:";
    resetDb();
    initializeDatabase();

    const hashedPassword = "$2b$10$testHashedPasswordForTesting";
    const user = authQueries.createUser({
      name: "Test User",
      email: "updatefields@test.com",
      password: hashedPassword
    });
    testUserId = user.lastInsertRowid as number;
    authToken = generateToken(testUserId);

    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/tasks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "Original Task",
          status: "pending",
          priority: "medium",
          tags: ["original"]
        })
      })
    );

    const data = await response.json();
    taskId = data.id;
  });

  afterAll(() => {
    const db = getDb();
    db.prepare("DELETE FROM tasks WHERE user_id = ?").run(testUserId);
    db.prepare("DELETE FROM users WHERE id = ?").run(testUserId);
  });

  test("updates priority, due_date, and tags", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request(`http://localhost/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          priority: "high",
          due_date: "2025-01-01T00:00:00Z",
          tags: ["updated", "new"]
        })
      })
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.priority).toBe("high");
    expect(data.due_date).toBe("2025-01-01T00:00:00Z");
    expect(data.tags).toBe(JSON.stringify(["updated", "new"]));
  });

  test("replaces tags when updating", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request(`http://localhost/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tags: ["replaced"]
        })
      })
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.tags).toBe(JSON.stringify(["replaced"]));
  });

  test("clears tags when updating with empty array", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request(`http://localhost/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tags: []
        })
      })
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.tags).toBeNull();
  });

  test("rejects update with more than 10 tags", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request(`http://localhost/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tags: ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11"]
        })
      })
    );

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.message).toBe("Maximum 10 tags allowed per task");
  });
});

describe("GET /tasks with filters and sorting", () => {
  let testUserId: number;
  let authToken: string;

  beforeAll(() => {
    process.env.DATABASE_PATH = ":memory:";
    resetDb();
    initializeDatabase();

    const hashedPassword = "$2b$10$testHashedPasswordForTesting";
    const user = authQueries.createUser({
      name: "Test User",
      email: "filters@test.com",
      password: hashedPassword
    });
    testUserId = user.lastInsertRowid as number;
    authToken = generateToken(testUserId);

    const db = getDb();
    const taskStmt = db.prepare(
      "INSERT INTO tasks (title, description, status, priority, due_date, tags, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const tagStmt = db.prepare("INSERT INTO task_tags (task_id, tag) VALUES (?, ?)");

    const taskId1 = taskStmt.run(
      "High Priority Task",
      "Important task",
      "pending",
      "high",
      "2024-12-31T23:59:59Z",
      JSON.stringify(["work", "urgent"]),
      testUserId
    ).lastInsertRowid as number;
    tagStmt.run(taskId1, "work");
    tagStmt.run(taskId1, "urgent");

    const taskId2 = taskStmt.run(
      "Low Priority Task",
      "Not urgent",
      "pending",
      "low",
      "2024-06-30T23:59:59Z",
      JSON.stringify(["personal"]),
      testUserId
    ).lastInsertRowid as number;
    tagStmt.run(taskId2, "personal");

    const taskId3 = taskStmt.run(
      "Medium Priority Task",
      "Normal task",
      "done",
      "medium",
      "2024-09-15T23:59:59Z",
      JSON.stringify(["work"]),
      testUserId
    ).lastInsertRowid as number;
    tagStmt.run(taskId3, "work");

    const taskId4 = taskStmt.run(
      "Another High Task",
      "Also important",
      "pending",
      "high",
      "2024-11-01T23:59:59Z",
      JSON.stringify(["urgent"]),
      testUserId
    ).lastInsertRowid as number;
    tagStmt.run(taskId4, "urgent");
  });

  afterAll(() => {
    const db = getDb();
    db.prepare("DELETE FROM tasks WHERE user_id = ?").run(testUserId);
    db.prepare("DELETE FROM users WHERE id = ?").run(testUserId);
  });

  test("filters by priority", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/tasks?priority=high", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
    );

    const data = await response.json();
    expect(data.data.length).toBe(2);
    expect(data.data.every((t: any) => t.priority === "high")).toBe(true);
  });

  test("filters by date range", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/tasks?due_date_from=2024-01-01T00:00:00Z&due_date_to=2024-12-31T23:59:59Z", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
    );

    const data = await response.json();
    expect(data.data.length).toBeGreaterThanOrEqual(1);
  });

  test("filters by tags (AND logic)", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/tasks?tags=work,urgent", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
    );

    const data = await response.json();
    expect(data.data.length).toBe(1);
    expect(data.data[0].title).toBe("High Priority Task");
  });

  test("filters by single tag", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/tasks?tags=work", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
    );

    const data = await response.json();
    expect(data.data.length).toBeGreaterThanOrEqual(2);
  });

  test("searches in title and description", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/tasks?search=important", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
    );

    const data = await response.json();
    expect(data.data.length).toBeGreaterThanOrEqual(1);
  });

  test("sorts by priority ascending", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/tasks?sort_by=priority&sort_order=asc", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
    );

    const data = await response.json();
    expect(data.data[0].priority).toBe("high");
    expect(data.data[data.data.length - 1].priority).toBe("low");
  });

  test("sorts by due_date ascending", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/tasks?sort_by=due_date&sort_order=asc", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
    );

    const data = await response.json();
    const tasksWithDueDate = data.data.filter((t: any) => t.due_date !== null);
    if (tasksWithDueDate.length > 1) {
      expect(new Date(tasksWithDueDate[0].due_date).getTime()).toBeLessThanOrEqual(
        new Date(tasksWithDueDate[1].due_date).getTime()
      );
    }
  });

  test("combines multiple filters", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/tasks?priority=high&tags=urgent&status=pending", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
    );

    const data = await response.json();
    expect(data.data.length).toBeGreaterThanOrEqual(1);
    expect(data.data.every((t: any) => t.priority === "high" && t.status === "pending")).toBe(true);
  });
});

describe("GET /tasks/tags", () => {
  let testUserId: number;
  let authToken: string;

  beforeAll(() => {
    process.env.DATABASE_PATH = ":memory:";
    resetDb();
    initializeDatabase();

    const hashedPassword = "$2b$10$testHashedPasswordForTesting";
    const user = authQueries.createUser({
      name: "Test User",
      email: "tags@test.com",
      password: hashedPassword
    });
    testUserId = user.lastInsertRowid as number;
    authToken = generateToken(testUserId);

    const db = getDb();
    const taskStmt = db.prepare(
      "INSERT INTO tasks (title, description, status, priority, tags, user_id) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const tagStmt = db.prepare("INSERT INTO task_tags (task_id, tag) VALUES (?, ?)");

    const taskId1 = taskStmt.run("Task 1", "Description", "pending", "medium", JSON.stringify(["work", "urgent"]), testUserId)
      .lastInsertRowid as number;
    tagStmt.run(taskId1, "work");
    tagStmt.run(taskId1, "urgent");

    const taskId2 = taskStmt.run("Task 2", "Description", "pending", "medium", JSON.stringify(["personal", "home"]), testUserId)
      .lastInsertRowid as number;
    tagStmt.run(taskId2, "personal");
    tagStmt.run(taskId2, "home");

    const taskId3 = taskStmt.run("Task 3", "Description", "pending", "medium", JSON.stringify(["work", "project"]), testUserId)
      .lastInsertRowid as number;
    tagStmt.run(taskId3, "work");
    tagStmt.run(taskId3, "project");
  });

  afterAll(() => {
    const db = getDb();
    db.prepare("DELETE FROM tasks WHERE user_id = ?").run(testUserId);
    db.prepare("DELETE FROM users WHERE id = ?").run(testUserId);
  });

  test("returns all unique tags for user", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/tasks/tags", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.tags).toContain("work");
    expect(data.tags).toContain("urgent");
    expect(data.tags).toContain("personal");
    expect(data.tags).toContain("home");
    expect(data.tags).toContain("project");
  });

  test("returns empty array for user with no tags", async () => {
    const hashedPassword = "$2b$10$testHashedPasswordForTesting";
    const user = authQueries.createUser({
      name: "No Tags User",
      email: "notags@test.com",
      password: hashedPassword
    });
    const userId = user.lastInsertRowid as number;
    const token = generateToken(userId);

    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(
      new Request("http://localhost/tasks/tags", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.tags).toEqual([]);

    const db = getDb();
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  });

  test("requires authentication", async () => {
    const app = new Elysia().use(taskRoutes);
    const response = await app.handle(new Request("http://localhost/tasks/tags"));

    expect(response.status).toBe(401);
  });
});
