import { loggerMiddleware } from "./middleware/logger";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Elysia } from "elysia";

describe("index.ts", () => {
  let originalConsoleLog: typeof console.log;
  let logCalls: string[] = [];

  beforeEach(() => {
    logCalls = [];
    originalConsoleLog = console.log;
    console.log = (...args: unknown[]) => {
      logCalls.push(args[0] as string);
    };
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  test("app with logger middleware logs all requests", async () => {
    const app = new Elysia().use(loggerMiddleware).get("/test", () => "success");

    await app.handle(new Request("http://localhost/test"));

    expect(logCalls.length).toBeGreaterThan(0);
    const logCall = logCalls[0];
    expect(logCall).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] GET http:\/\/localhost\/test - 200 - \d+ms/);
  });
});
