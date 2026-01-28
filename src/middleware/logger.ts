import type { Elysia } from "elysia";

export const loggerMiddleware = (app: Elysia) =>
  app
    .derive(() => {
      return {
        startTime: Date.now()
      };
    })
    .onAfterHandle(({ request, set, startTime }) => {
      const duration = Date.now() - (startTime ?? 0);
      const timestamp = new Date().toISOString();
      const method = request.method;
      const url = request.url;

      console.log(`[${timestamp}] ${method} ${url} - ${set.status} - ${duration}ms`);
    })
    .onError(({ error, request, startTime }) => {
      const duration = Date.now() - (startTime ?? 0);
      const timestamp = new Date().toISOString();
      const method = request.method;
      const url = request.url;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.log(`[${timestamp}] ${method} ${url} - ERROR: ${errorMessage} - ${duration}ms`);
    });
