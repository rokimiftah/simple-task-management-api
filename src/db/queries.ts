import { getDb } from "./index";
import type { CreateTaskInput, CreateUserInput, Task, UpdateTaskInput, User } from "../types";

export const authQueries = {
  findUserByEmail: (email: string) => {
    const db = getDb();
    const stmt = db.prepare("SELECT id, name, email, password FROM users WHERE email = ?");
    return stmt.get(email) as User | undefined;
  },

  findUserById: (id: number) => {
    const db = getDb();
    const stmt = db.prepare("SELECT id, name, email FROM users WHERE id = ?");
    return stmt.get(id) as User | undefined;
  },

  createUser: (input: CreateUserInput) => {
    const db = getDb();
    const stmt = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
    return stmt.run(input.name, input.email, input.password) as { lastInsertRowid: number; changes: number };
  },

  validateUser: (input: { email: string; password: string }) => {
    const db = getDb();
    const stmt = db.prepare("SELECT id, name, email, password FROM users WHERE email = ?");
    return stmt.get(input.email) as User | undefined;
  }
};

export const taskQueries = {
  findAllTasks: (userId: number, page: number = 1, limit: number = 10) => {
    const db = getDb();
    const offset = (page - 1) * limit;
    const stmt = db.prepare(
      "SELECT id, title, description, status, user_id, created_at, updated_at, deleted_at FROM tasks WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?"
    );
    return stmt.all(userId, limit, offset) as Task[];
  },

  countTasks: (userId: number) => {
    const db = getDb();
    const stmt = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND deleted_at IS NULL");
    const result = stmt.get(userId) as { count: number };
    return result.count;
  },

  findTaskById: (id: number, userId: number) => {
    const db = getDb();
    const stmt = db.prepare(
      "SELECT id, title, description, status, user_id, created_at, updated_at, deleted_at FROM tasks WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
    );
    return stmt.get(id, userId) as Task | undefined;
  },

  createTask: (input: CreateTaskInput & { userId: number }) => {
    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO tasks (title, description, status, user_id, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)"
    );
    return stmt.run(input.title, input.description || null, input.status, input.userId) as {
      lastInsertRowid: number;
      changes: number;
    };
  },

  updateTask: (input: UpdateTaskInput & { id: number; userId: number }) => {
    const { id, userId, title, description, status } = input;
    const db = getDb();

    if (title !== undefined && description !== undefined && status !== undefined) {
      const stmt = db.prepare(
        "UPDATE tasks SET title = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?"
      );
      return stmt.run(title, description, status, id, userId) as { lastInsertRowid: number; changes: number };
    }

    if (title !== undefined && description !== undefined) {
      const stmt = db.prepare(
        "UPDATE tasks SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?"
      );
      return stmt.run(title, description, id, userId) as { lastInsertRowid: number; changes: number };
    }

    if (title !== undefined && status !== undefined) {
      const stmt = db.prepare(
        "UPDATE tasks SET title = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?"
      );
      return stmt.run(title, status, id, userId) as { lastInsertRowid: number; changes: number };
    }

    if (description !== undefined && status !== undefined) {
      const stmt = db.prepare(
        "UPDATE tasks SET description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?"
      );
      return stmt.run(description, status, id, userId) as { lastInsertRowid: number; changes: number };
    }

    if (title !== undefined) {
      const stmt = db.prepare("UPDATE tasks SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?");
      return stmt.run(title, id, userId) as { lastInsertRowid: number; changes: number };
    }

    if (description !== undefined) {
      const stmt = db.prepare("UPDATE tasks SET description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?");
      return stmt.run(description, id, userId) as { lastInsertRowid: number; changes: number };
    }

    if (status !== undefined) {
      const stmt = db.prepare("UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?");
      return stmt.run(status, id, userId) as { lastInsertRowid: number; changes: number };
    }

    return { lastInsertRowid: 0, changes: 0 };
  },

  deleteTask: (id: number, userId: number) => {
    const db = getDb();
    const stmt = db.prepare("UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?");
    return stmt.run(id, userId) as { lastInsertRowid: number; changes: number };
  }
};
