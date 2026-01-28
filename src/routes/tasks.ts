import { taskQueries } from "../db/queries";
import { authMiddleware } from "../middleware/auth";
import { Elysia, t } from "elysia";
import type { CreateTaskInput, UpdateTaskInput } from "../types";

export const taskRoutes = new Elysia({ prefix: "/api" })
  .use(authMiddleware)
  .get(
    "/tasks",
    ({ userId, query }) => {
      if (!userId) return [];

      const page = query.page ?? 1;
      const limit = query.limit ?? 10;

      const tasks = taskQueries.findAllTasks(userId, page, limit);
      const total = taskQueries.countTasks(userId);
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
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 }))
      }),
      detail: {
        tags: ["Tasks"],
        summary: "Get all tasks",
        description:
          "Retrieve all tasks belonging to the authenticated user, ordered by creation date descending. Supports pagination via query parameters: page (default: 1) and limit (default: 10, max: 100)."
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
        status: t.Union([t.Literal("pending"), t.Literal("done")])
      }),
      detail: {
        tags: ["Tasks"],
        summary: "Create new task",
        description: "Create a new task for the authenticated user. Title is required, description and status are optional."
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
          status: t.Union([t.Literal("pending"), t.Literal("done")])
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
