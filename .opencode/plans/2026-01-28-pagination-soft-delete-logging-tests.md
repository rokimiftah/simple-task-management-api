# Pagination, Soft Delete, Logging & Unit Tests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement pagination for GET /tasks, soft delete functionality, request logging middleware, and comprehensive unit tests for the API.

**Architecture:**

- Add `deleted_at` column to tasks table for soft delete
- Modify queries to support pagination with page/limit parameters
- Create middleware for request/response logging with timing
- Use Bun test runner with Elysia treaty for API testing

**Tech Stack:** Bun, Elysia, SQLite, Bun test runner, @elysiajs/eden

---

## Task 1: Add Soft Delete Column to Database Schema

**Files:**

- Modify: `src/db/schema.ts`

**Step 1: Update tasks table schema**

Add `deleted_at` column to tasks table:

```typescript
export function initializeDatabase(): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL CHECK(status IN ('pending', 'done')),
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}
```

**Step 2: Run typecheck**

Run: `bun run lint:typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add deleted_at column for soft delete"
```

---

## Task 2: Update Task Type Definitions

**Files:**

- Modify: `src/types/index.ts`

**Step 1: Add deleted_at to Task interface**

```typescript
export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: "pending" | "done";
  user_id: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
```

**Step 2: Run typecheck**

Run: `bun run lint:typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add deleted_at to Task type"
```

---

## Task 3: Update Queries for Pagination and Soft Delete

**Files:**

- Modify: `src/db/queries.ts`

**Step 1: Update findAllTasks to support pagination**

```typescript
findAllTasks: (userId: number, page: number = 1, limit: number = 10) => {
  const offset = (page - 1) * limit;
  const stmt = db.prepare(
    `SELECT id, title, description, status, user_id, created_at, updated_at, deleted_at
     FROM tasks
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  );
  return stmt.all(userId, limit, offset) as Task[];
},
```

**Step 2: Add countTasks for pagination metadata**

```typescript
countTasks: (userId: number) => {
  const stmt = db.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND deleted_at IS NULL"
  );
  const result = stmt.get(userId) as { count: number };
  return result.count;
},
```

**Step 3: Update deleteTask for soft delete**

```typescript
deleteTask: (id: number, userId: number) => {
  const stmt = db.prepare(
    "UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?"
  );
  return stmt.run(id, userId) as { lastInsertRowid: number; changes: number };
},
```

**Step 4: Run typecheck**

Run: `bun run lint:typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add src/db/queries.ts
git commit -m "feat: add pagination and soft delete to queries"
```

---

## Task 4: Create Logger Middleware

**Files:**

- Create: `src/middleware/logger.ts`

**Step 1: Write the logger middleware**

```typescript
import type { Elysia } from "elysia";

export const loggerMiddleware = (app: Elysia) =>
  app
    .derive(() => {
      return {
        startTime: Date.now()
      };
    })
    .onAfterHandle(({ request, set, startTime }) => {
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] ${request.method} ${request.url} - ${set.status} - ${duration}ms`);
    })
    .onError(({ request, error, startTime }) => {
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] ${request.method} ${request.url} - ERROR: ${error} - ${duration}ms`);
    });
```

**Step 2: Run typecheck**

Run: `bun run lint:typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/middleware/logger.ts
git commit -m "feat: add request logging middleware"
```

---

## Task 5: Update Tasks Route with Pagination

**Files:**

- Modify: `src/routes/tasks.ts`

**Step 1: Add query parameters for pagination**

```typescript
.get(
  "/tasks",
  ({ userId, query }) => {
    if (!userId) return [];

    const page = query.page ? parseInt(query.page as string, 10) : 1;
    const limit = query.limit ? parseInt(query.limit as string, 10) : 10;

    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(100, Math.max(1, limit));

    const tasks = taskQueries.findAllTasks(userId, validatedPage, validatedLimit);
    const total = taskQueries.countTasks(userId);
    const totalPages = Math.ceil(total / validatedLimit);

    return {
      data: tasks,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        totalPages,
        hasNext: validatedPage < totalPages,
        hasPrev: validatedPage > 1
      }
    };
  },
  {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String())
    }),
    detail: {
      tags: ["Tasks"],
      summary: "Get all tasks with pagination",
      description: "Retrieve paginated tasks belonging to the authenticated user. Default: page=1, limit=10. Max limit: 100."
    }
  }
)
```

**Step 2: Run typecheck**

Run: `bun run lint:typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/routes/tasks.ts
git commit -m "feat: add pagination to GET /tasks"
```

---

## Task 6: Update Delete Endpoint for Soft Delete

**Files:**

- Modify: `src/routes/tasks.ts`

**Step 1: Update delete endpoint description**

```typescript
.delete(
  "/tasks/:id",
  ({ params, userId, set }) => {
    if (!userId) {
      set.status = 401;
      return {
        error: "Unauthorized",
        message: "Invalid token"
      };
    }

    const taskId = parseInt(params.id as string, 10);

    const existingTask = taskQueries.findTaskById(taskId, userId);

    if (!existingTask) {
      set.status = 404;
      return {
        error: "Not Found",
        message: "Task not found"
      };
    }

    taskQueries.deleteTask(taskId, userId);

    return {
      message: "Task deleted successfully"
    };
  },
  {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      tags: ["Tasks"],
      summary: "Soft delete task",
      description: "Soft delete a task by ID (marks as deleted). User can only delete their own tasks."
    }
  }
)
```

**Step 2: Run typecheck**

Run: `bun run lint:typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/routes/tasks.ts
git commit -m "docs: update delete endpoint description for soft delete"
```

---

## Task 7: Apply Logger Middleware to App

**Files:**

- Modify: `src/index.ts`

**Step 1: Import and use logger middleware**

```typescript
import { initializeDatabase } from "./db/schema";
import { loggerMiddleware } from "./middleware/logger";
import { authRoutes } from "./routes/auth";
import { taskRoutes } from "./routes/tasks";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";

initializeDatabase();

const app = new Elysia().use(loggerMiddleware).use(authRoutes).use(taskRoutes);
```

**Step 2: Run typecheck**

Run: `bun run lint:typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: apply logger middleware to app"
```

---

## Task 8: Create Test Setup File

**Files:**

- Create: `tests/setup.ts`

**Step 1: Write test setup**

```typescript
import db from "../src/db/index";
import { initializeDatabase } from "../src/db/schema";

export function setupTestDatabase() {
  const testDbPath = ":memory:";
  process.env.DATABASE_PATH = testDbPath;

  initializeDatabase();
}

export function cleanupTestDatabase() {
  db.close();
}
```

**Step 2: Run typecheck**

Run: `bun run lint:typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add tests/setup.ts
git commit -m "test: add test setup utilities"
```

---

## Task 9: Write Unit Tests for Queries

**Files:**

- Create: `tests/queries.test.ts`

**Step 1: Write test file**

```typescript
import { authQueries, taskQueries } from "../src/db/queries";
import { cleanupTestDatabase, setupTestDatabase } from "./setup";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("Task Queries", () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  describe("createTask", () => {
    it("should create a new task", () => {
      const user = authQueries.createUser({
        name: "Test User",
        email: "test@example.com",
        password: "hashedpassword"
      });

      const result = taskQueries.createTask({
        title: "Test Task",
        description: "Test Description",
        status: "pending",
        userId: user.lastInsertRowid as number
      });

      expect(result.lastInsertRowid).toBeGreaterThan(0);
      expect(result.changes).toBe(1);
    });
  });

  describe("findAllTasks", () => {
    it("should return empty array for user with no tasks", () => {
      const user = authQueries.createUser({
        name: "Test User",
        email: "test@example.com",
        password: "hashedpassword"
      });

      const tasks = taskQueries.findAllTasks(user.lastInsertRowid as number);
      expect(tasks).toEqual([]);
    });

    it("should return paginated tasks", () => {
      const user = authQueries.createUser({
        name: "Test User",
        email: "test@example.com",
        password: "hashedpassword"
      });

      for (let i = 1; i <= 15; i++) {
        taskQueries.createTask({
          title: `Task ${i}`,
          description: `Description ${i}`,
          status: "pending",
          userId: user.lastInsertRowid as number
        });
      }

      const page1 = taskQueries.findAllTasks(user.lastInsertRowid as number, 1, 10);
      const page2 = taskQueries.findAllTasks(user.lastInsertRowid as number, 2, 10);

      expect(page1.length).toBe(10);
      expect(page2.length).toBe(5);
    });
  });

  describe("countTasks", () => {
    it("should count tasks correctly", () => {
      const user = authQueries.createUser({
        name: "Test User",
        email: "test@example.com",
        password: "hashedpassword"
      });

      for (let i = 1; i <= 5; i++) {
        taskQueries.createTask({
          title: `Task ${i}`,
          description: `Description ${i}`,
          status: "pending",
          userId: user.lastInsertRowid as number
        });
      }

      const count = taskQueries.countTasks(user.lastInsertRowid as number);
      expect(count).toBe(5);
    });
  });

  describe("deleteTask (soft delete)", () => {
    it("should soft delete a task", () => {
      const user = authQueries.createUser({
        name: "Test User",
        email: "test@example.com",
        password: "hashedpassword"
      });

      const result = taskQueries.createTask({
        title: "Test Task",
        description: "Test Description",
        status: "pending",
        userId: user.lastInsertRowid as number
      });

      const taskId = result.lastInsertRowid as number;

      taskQueries.deleteTask(taskId, user.lastInsertRowid as number);

      const tasks = taskQueries.findAllTasks(user.lastInsertRowid as number);
      expect(tasks.length).toBe(0);
    });
  });
});
```

**Step 2: Run tests**

Run: `bun test tests/queries.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add tests/queries.test.ts
git commit -m "test: add unit tests for queries"
```

---

## Task 10: Write API Integration Tests

**Files:**

- Create: `tests/api.test.ts`

**Step 1: Add @elysiajs/eden dependency**

Run: `bun add -d @elysiajs/eden`

**Step 2: Write API tests**

```typescript
import { initializeDatabase } from "../src/db/schema";
import { loggerMiddleware } from "../src/middleware/logger";
import { authRoutes } from "../src/routes/auth";
import { taskRoutes } from "../src/routes/tasks";
import { treaty } from "@elysiajs/eden";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Elysia } from "elysia";

describe("API Integration Tests", () => {
  let app: Elysia;
  let api: any;
  let authToken: string;
  let userId: number;

  beforeAll(() => {
    initializeDatabase();

    app = new Elysia().use(loggerMiddleware).use(authRoutes).use(taskRoutes);

    api = treaty(app);
  });

  it("should register a new user", async () => {
    const { data, error } = await api.auth.register.post({
      name: "Test User",
      email: "test@example.com",
      password: "password123"
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.user.email).toBe("test@example.com");
  });

  it("should login user", async () => {
    const { data, error } = await api.auth.login.post({
      email: "test@example.com",
      password: "password123"
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.token).toBeDefined();

    authToken = data?.token;
    userId = data?.user.id;
  });

  describe("GET /tasks with pagination", () => {
    beforeAll(async () => {
      for (let i = 1; i <= 15; i++) {
        await api.tasks.post(
          {
            title: `Task ${i}`,
            description: `Description ${i}`,
            status: "pending"
          },
          {
            headers: {
              Authorization: `Bearer ${authToken}`
            }
          }
        );
      }
    });

    it("should return paginated tasks with default params", async () => {
      const { data, error } = await api.tasks.get({
        query: {},
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.data.length).toBe(10);
      expect(data?.pagination.page).toBe(1);
      expect(data?.pagination.limit).toBe(10);
      expect(data?.pagination.total).toBe(15);
      expect(data?.pagination.totalPages).toBe(2);
      expect(data?.pagination.hasNext).toBe(true);
      expect(data?.pagination.hasPrev).toBe(false);
    });

    it("should return second page of tasks", async () => {
      const { data, error } = await api.tasks.get({
        query: { page: "2", limit: "10" },
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(error).toBeNull();
      expect(data?.data.length).toBe(5);
      expect(data?.pagination.page).toBe(2);
      expect(data?.pagination.hasPrev).toBe(true);
      expect(data?.pagination.hasNext).toBe(false);
    });

    it("should respect custom limit", async () => {
      const { data, error } = await api.tasks.get({
        query: { limit: "5" },
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(error).toBeNull();
      expect(data?.data.length).toBe(5);
      expect(data?.pagination.totalPages).toBe(3);
    });
  });

  describe("DELETE /tasks (soft delete)", () => {
    it("should soft delete a task", async () => {
      const createResult = await api.tasks.post(
        {
          title: "Task to Delete",
          description: "This will be soft deleted",
          status: "pending"
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );

      const taskId = createResult.data?.id;

      const deleteResult = await api.tasks({ id: taskId.toString() }).delete({
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(deleteResult.error).toBeNull();
      expect(deleteResult.data?.message).toBe("Task deleted successfully");

      const getResult = await api.tasks({ id: taskId.toString() }).get({
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(getResult.status).toBe(404);
    });

    it("should not include soft deleted tasks in list", async () => {
      const { data, error } = await api.tasks.get({
        query: {},
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(error).toBeNull();
      expect(data?.data.length).toBe(15);
      expect(data?.data.find((t: any) => t.title === "Task to Delete")).toBeUndefined();
    });
  });
});
```

**Step 3: Run tests**

Run: `bun test tests/api.test.ts`
Expected: All tests pass

**Step 4: Commit**

```bash
git add tests/api.test.ts package.json bun.lockb
git commit -m "test: add API integration tests"
```

---

## Task 11: Add Test Script to package.json

**Files:**

- Modify: `package.json`

**Step 1: Add test script**

```json
{
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "start": "bun run src/index.ts",
    "start:cluster": "bun run src/cluster.ts",
    "build": "bun build --compile --minify-whitespace --minify-syntax --target bun --outfile server src/index.ts",
    "build:cluster": "bun build --compile --minify-whitespace --minify-syntax --target bun --outfile server src/cluster.ts",
    "build:linux": "bun build --compile --minify-whitespace --minify-syntax --target bun-linux-x64 --outfile server src/index.ts",
    "build:linux-cluster": "bun build --compile --minify-whitespace --minify-syntax --target bun-linux-x64 --outfile server src/cluster.ts",
    "build:docker": "bun build --compile --minify-whitespace --minify-syntax --target bun --outfile server src/index.ts && chmod +x server",
    "format": "prettier --write .",
    "lint:typecheck": "biome check --write --unsafe . && tsc --noEmit",
    "test": "bun test"
  },
```

**Step 2: Run tests**

Run: `bun test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add test script to package.json"
```

---

## Task 12: Final Verification

**Files:**

- None (verification only)

**Step 1: Run all tests**

Run: `bun test`
Expected: All tests pass (both queries.test.ts and api.test.ts)

**Step 2: Run typecheck**

Run: `bun run lint:typecheck`
Expected: No errors

**Step 3: Start development server**

Run: `bun run dev`
Expected: Server starts successfully on port 3000

**Step 4: Test pagination manually**

Run in another terminal:

```bash
curl -H "Authorization: Bearer secret-token-123:1" "http://localhost:3000/api/tasks?page=1&limit=5"
```

Expected: Returns 5 tasks with pagination metadata

**Step 5: Test soft delete manually**

```bash
curl -X DELETE -H "Authorization: Bearer secret-token-123:1" "http://localhost:3000/api/tasks/1"
```

Expected: Returns success message, task no longer appears in GET /tasks

**Step 6: Verify logging**

Check server console output
Expected: Shows logs like `[2026-01-28T...] GET /api/tasks - 200 - 15ms`

**Step 7: Final commit**

```bash
git add .
git commit -m "feat: implement pagination, soft delete, logging and unit tests"
```

---

## Summary

This plan implements:

1. **Pagination** - GET /tasks with `page` and `limit` query parameters (default: page=1, limit=10, max=100)
2. **Soft Delete** - Tasks marked with `deleted_at` instead of hard deletion
3. **Request Logging** - Console logging with timestamp, method, URL, status, and duration
4. **Unit Tests** - Comprehensive tests for queries and API endpoints using Bun test runner

Total commits: 12
Total tasks: 12
Estimated time: 2-3 hours
