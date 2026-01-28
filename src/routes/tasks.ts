import { taskQueries } from "../db/queries";
import { authMiddleware } from "../middleware/auth";
import { Elysia, t } from "elysia";
import type { CreateTaskInput, Priority, TaskSortBy, TaskSortOrder, UpdateTaskInput } from "../types";

const _PRIORITY_VALUES = ["low", "medium", "high"] as const;
const _SORT_BY_VALUES = ["title", "due_date", "priority", "created_at"] as const;
const _SORT_ORDER_VALUES = ["asc", "desc"] as const;

export const taskRoutes = new Elysia()
  .use(authMiddleware)
  .get(
    "/tasks",
    ({ userId, query }) => {
      if (!userId) return [];

      const page = query.page ?? 1;
      const limit = query.limit ?? 10;

      const filter: Record<string, unknown> = {};
      if (query.priority) filter.priority = query.priority as Priority;
      if (query.due_date_from) filter.due_date_from = query.due_date_from;
      if (query.due_date_to) filter.due_date_to = query.due_date_to;
      if (query.tags) filter.tags = query.tags.split(",").map((t) => t.trim());
      if (query.search) filter.search = query.search;

      const sortBy = (query.sort_by ?? "created_at") as TaskSortBy;
      const sortOrder = (query.sort_order ?? "desc") as TaskSortOrder;

      const tasks = taskQueries.findAllTasksEnhanced(userId, filter, sortBy, sortOrder, page, limit);
      const total = taskQueries.countTasksEnhanced(userId, filter);
      const totalPages = Math.ceil(total / limit);

      return {
        data: tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
        priority: t.Optional(t.Union([t.Literal("low"), t.Literal("medium"), t.Literal("high")])),
        due_date_from: t.Optional(t.String()),
        due_date_to: t.Optional(t.String()),
        tags: t.Optional(t.String()),
        sort_by: t.Optional(t.Union([t.Literal("title"), t.Literal("due_date"), t.Literal("priority"), t.Literal("created_at")])),
        sort_order: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
        search: t.Optional(t.String({ maxLength: 100 }))
      }),
      detail: {
        tags: ["Tasks"],
        summary: "Get all tasks with filters",
        description:
          "Retrieve all tasks belonging to the authenticated user with advanced filtering and sorting options. Supports pagination, priority filtering, date range filtering, tag filtering, search, and sorting."
      }
    }
  )
  .get(
    "/tasks/tags",
    ({ userId, set }) => {
      if (!userId) {
        set.status = 401;
        return {
          error: "Unauthorized",
          message: "Invalid token"
        };
      }

      const tags = taskQueries.getAllTags(userId);
      return { tags };
    },
    {
      detail: {
        tags: ["Tasks"],
        summary: "Get all unique tags",
        description: "Retrieve all unique tags for the authenticated user's tasks."
      }
    }
  )
  .get(
    "/tasks/:id",
    ({ params, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return {
          error: "Unauthorized",
          message: "Invalid token"
        };
      }

      const task = taskQueries.findTaskById(parseInt(params.id as string, 10), userId);

      if (!task) {
        set.status = 404;
        return {
          error: "Not Found",
          message: "Task not found"
        };
      }

      return task;
    },
    {
      params: t.Object({
        id: t.String()
      }),
      detail: {
        tags: ["Tasks"],
        summary: "Get task by ID",
        description: "Retrieve a specific task by its ID. User can only access their own tasks."
      }
    }
  )
  .post(
    "/tasks",
    ({ body, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return {
          error: "Unauthorized",
          message: "Invalid token"
        };
      }

      const taskInput = body as CreateTaskInput;

      if (taskInput.tags && taskInput.tags.length > 10) {
        set.status = 400;
        return {
          error: "Bad Request",
          message: "Maximum 10 tags allowed per task"
        };
      }

      try {
        const result = taskQueries.createTask({
          ...taskInput,
          userId
        });

        const task = taskQueries.findTaskById(result.lastInsertRowid, userId);

        set.status = 201;
        return task;
      } catch (error) {
        console.error("Create task error:", error);
        set.status = 400;
        return {
          error: "Bad Request",
          message: "Failed to create task"
        };
      }
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
        status: t.Union([t.Literal("pending"), t.Literal("done")]),
        priority: t.Optional(t.Union([t.Literal("low"), t.Literal("medium"), t.Literal("high")])),
        due_date: t.Optional(t.String()),
        tags: t.Optional(t.Array(t.String({ maxLength: 50 })))
      }),
      detail: {
        tags: ["Tasks"],
        summary: "Create new task",
        description:
          "Create a new task for the authenticated user. Title is required. Optional fields: description, status, priority, due_date, tags (max 10)."
      }
    }
  )
  .put(
    "/tasks/:id",
    ({ params, body, userId, set }) => {
      if (!userId) {
        set.status = 401;
        return {
          error: "Unauthorized",
          message: "Invalid token"
        };
      }

      const taskId = parseInt(params.id as string, 10);
      const taskInput = body as UpdateTaskInput;

      if (taskInput.tags && taskInput.tags.length > 10) {
        set.status = 400;
        return {
          error: "Bad Request",
          message: "Maximum 10 tags allowed per task"
        };
      }

      const existingTask = taskQueries.findTaskById(taskId, userId);

      if (!existingTask) {
        set.status = 404;
        return {
          error: "Not Found",
          message: "Task not found"
        };
      }

      try {
        taskQueries.updateTask({
          ...taskInput,
          id: taskId,
          userId
        });

        const updatedTask = taskQueries.findTaskById(taskId, userId);

        return updatedTask;
      } catch (error) {
        console.error("Update task error:", error);
        set.status = 400;
        return {
          error: "Bad Request",
          message: "Failed to update task"
        };
      }
    },
    {
      params: t.Object({
        id: t.String()
      }),
      body: t.Partial(
        t.Object({
          title: t.String({ minLength: 1 }),
          description: t.String(),
          status: t.Union([t.Literal("pending"), t.Literal("done")]),
          priority: t.Optional(t.Union([t.Literal("low"), t.Literal("medium"), t.Literal("high")])),
          due_date: t.Optional(t.String()),
          tags: t.Optional(t.Array(t.String({ maxLength: 50 })))
        })
      ),
      detail: {
        tags: ["Tasks"],
        summary: "Update task",
        description: "Update a task by ID. Supports partial updates - only provide fields that need to be changed."
      }
    }
  )
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
  );
