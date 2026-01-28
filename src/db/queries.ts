import { buildTaskQuery } from "./builders/taskFilterBuilder";
import { getDb } from "./index";
import type {
  CreateTaskInput,
  CreateUserInput,
  Priority,
  Task,
  TaskFilter,
  TaskSortBy,
  TaskSortOrder,
  UpdateTaskInput,
  User
} from "../types";

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
      "SELECT id, title, description, status, priority, due_date, tags, user_id, created_at, updated_at, deleted_at FROM tasks WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?"
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
      "SELECT id, title, description, status, priority, due_date, tags, user_id, created_at, updated_at, deleted_at FROM tasks WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
    );
    return stmt.get(id, userId) as Task | undefined;
  },

  findAllTasksEnhanced: (
    userId: number,
    filter: TaskFilter,
    sortBy: TaskSortBy = "created_at",
    sortOrder: TaskSortOrder = "desc",
    page: number = 1,
    limit: number = 10
  ): Task[] => {
    const db = getDb();
    const { whereClause, params, orderByClause } = buildTaskQuery(userId, filter, sortBy, sortOrder);
    const offset = (page - 1) * limit;

    const query = `
      SELECT id, title, description, status, priority, due_date, tags, user_id, created_at, updated_at, deleted_at 
      FROM tasks 
      WHERE ${whereClause} 
      ORDER BY ${orderByClause} 
      LIMIT ? OFFSET ?
    `;

    const stmt = db.prepare(query);
    const allParams = [...params, limit, offset] as any;
    return stmt.all(...allParams) as Task[];
  },

  countTasksEnhanced: (userId: number, filter: TaskFilter): number => {
    const db = getDb();
    const { whereClause, params } = buildTaskQuery(userId, filter);
    const query = `SELECT COUNT(*) as count FROM tasks WHERE ${whereClause}`;
    const stmt = db.prepare(query);
    const result = stmt.get(...(params as any)) as { count: number };
    return result.count;
  },

  findTasksByPriority: (userId: number, priority: Priority, page: number = 1, limit: number = 10): Task[] => {
    const db = getDb();
    const offset = (page - 1) * limit;
    const stmt = db.prepare(
      "SELECT id, title, description, status, priority, due_date, tags, user_id, created_at, updated_at, deleted_at FROM tasks WHERE user_id = ? AND deleted_at IS NULL AND priority = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    );
    return stmt.all(userId, priority, limit, offset) as Task[];
  },

  findTasksByDateRange: (
    userId: number,
    dueDateFrom: string,
    dueDateTo: string,
    page: number = 1,
    limit: number = 10
  ): Task[] => {
    const db = getDb();
    const offset = (page - 1) * limit;
    const stmt = db.prepare(
      "SELECT id, title, description, status, priority, due_date, tags, user_id, created_at, updated_at, deleted_at FROM tasks WHERE user_id = ? AND deleted_at IS NULL AND due_date >= ? AND due_date <= ? ORDER BY due_date ASC LIMIT ? OFFSET ?"
    );
    return stmt.all(userId, dueDateFrom, dueDateTo, limit, offset) as Task[];
  },

  findTasksByTags: (userId: number, tags: string[], page: number = 1, limit: number = 10): Task[] => {
    const db = getDb();
    const offset = (page - 1) * limit;
    const tagPlaceholders = tags.map(() => "?").join(",");
    const query = `
      SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.tags, t.user_id, t.created_at, t.updated_at, t.deleted_at 
      FROM tasks t 
      WHERE t.user_id = ? AND t.deleted_at IS NULL AND t.id IN (
        SELECT task_id FROM task_tags 
        WHERE tag IN (${tagPlaceholders}) 
        GROUP BY task_id 
        HAVING COUNT(DISTINCT tag) = ?
      ) 
      ORDER BY t.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const stmt = db.prepare(query);
    return stmt.all(userId, ...tags, tags.length, limit, offset) as Task[];
  },

  searchTasks: (userId: number, searchTerm: string, page: number = 1, limit: number = 10): Task[] => {
    const db = getDb();
    const offset = (page - 1) * limit;
    const likeTerm = `%${searchTerm}%`;
    const stmt = db.prepare(
      "SELECT id, title, description, status, priority, due_date, tags, user_id, created_at, updated_at, deleted_at FROM tasks WHERE user_id = ? AND deleted_at IS NULL AND (title LIKE ? OR description LIKE ?) ORDER BY created_at DESC LIMIT ? OFFSET ?"
    );
    return stmt.all(userId, likeTerm, likeTerm, limit, offset) as Task[];
  },

  getAllTags: (userId: number): string[] => {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT DISTINCT tt.tag 
      FROM task_tags tt 
      INNER JOIN tasks t ON tt.task_id = t.id 
      WHERE t.user_id = ? AND t.deleted_at IS NULL 
      ORDER BY tt.tag ASC
    `);
    const results = stmt.all(userId) as Array<{ tag: string }>;
    return results.map((r) => r.tag);
  },

  createTask: (input: CreateTaskInput & { userId: number }) => {
    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO tasks (title, description, status, priority, due_date, tags, user_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
    );
    const result = stmt.run(
      input.title,
      input.description || null,
      input.status,
      input.priority || "medium",
      input.due_date || null,
      input.tags ? JSON.stringify(input.tags) : null,
      input.userId
    ) as { lastInsertRowid: number; changes: number };

    if (input.tags && input.tags.length > 0 && result.lastInsertRowid > 0) {
      const tagStmt = db.prepare("INSERT INTO task_tags (task_id, tag) VALUES (?, ?)");
      for (const tag of input.tags) {
        tagStmt.run(result.lastInsertRowid, tag);
      }
    }

    return result;
  },

  updateTask: (input: UpdateTaskInput & { id: number; userId: number }) => {
    const { id, userId, title, description, status, priority, due_date, tags } = input;
    const db = getDb();

    const updateFields: string[] = [];
    const updateValues: (string | number | null)[] = [];

    if (title !== undefined) {
      updateFields.push("title = ?");
      updateValues.push(title);
    }

    if (description !== undefined) {
      updateFields.push("description = ?");
      updateValues.push(description);
    }

    if (status !== undefined) {
      updateFields.push("status = ?");
      updateValues.push(status);
    }

    if (priority !== undefined) {
      updateFields.push("priority = ?");
      updateValues.push(priority);
    }

    if (due_date !== undefined) {
      updateFields.push("due_date = ?");
      updateValues.push(due_date);
    }

    if (tags !== undefined) {
      updateFields.push("tags = ?");
      updateValues.push(tags.length > 0 ? JSON.stringify(tags) : null);
    }

    if (updateFields.length === 0) {
      return { lastInsertRowid: 0, changes: 0 };
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");
    updateValues.push(id, userId);

    const query = `UPDATE tasks SET ${updateFields.join(", ")} WHERE id = ? AND user_id = ?`;
    const result = db.prepare(query).run(...updateValues) as { lastInsertRowid: number; changes: number };

    if (tags !== undefined && result.changes > 0) {
      db.prepare("DELETE FROM task_tags WHERE task_id = ?").run(id);

      if (tags.length > 0) {
        const tagStmt = db.prepare("INSERT INTO task_tags (task_id, tag) VALUES (?, ?)");
        for (const tag of tags) {
          tagStmt.run(id, tag);
        }
      }
    }

    return result;
  },

  deleteTask: (id: number, userId: number) => {
    const db = getDb();
    const stmt = db.prepare("UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?");
    return stmt.run(id, userId) as { lastInsertRowid: number; changes: number };
  }
};
