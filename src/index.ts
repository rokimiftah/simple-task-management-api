import { initializeDatabase } from "./db/schema";
import { authRoutes } from "./routes/auth";
import { taskRoutes } from "./routes/tasks";
import { Elysia } from "elysia";

initializeDatabase();

const app = new Elysia()
  .use(authRoutes)
  .use(taskRoutes)
  .get("/", () => ({
    message: "Simple Task Management API",
    version: "1.0.0",
    endpoints: {
      auth: {
        register: "POST /api/register",
        login: "POST /api/login",
      },
      tasks: {
        list: "GET /api/tasks",
        detail: "GET /api/tasks/:id",
        create: "POST /api/tasks",
        update: "PUT /api/tasks/:id",
        delete: "DELETE /api/tasks/:id",
      },
    },
  }))
  .listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
