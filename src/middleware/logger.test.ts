import { loggerMiddleware } from "./logger";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Elysia } from "elysia";

describe("loggerMiddleware", () => {
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

  test("logs successful requests with timestamp, method, url, status, and duration", async () => {
    const app = new Elysia().use(loggerMiddleware).get("/test", () => "success");

    await app.handle(new Request("http://localhost/test"));

    expect(logCalls.length).toBeGreaterThan(0);
    const logCall = logCalls[0];
    expect(logCall).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] GET http:\/\/localhost\/test - 200 - \d+ms/);
  });

  test("logs POST requests", async () => {
    const app = new Elysia().use(loggerMiddleware).post("/tasks", () => ({ id: 1 }));

    await app.handle(new Request("http://localhost/tasks", { method: "POST" }));

    expect(logCalls.length).toBeGreaterThan(0);
    const logCall = logCalls[0];
    expect(logCall).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] POST http:\/\/localhost\/tasks - 200 - \d+ms/);
  });

  test("logs errors with error message", async () => {
    const app = new Elysia().use(loggerMiddleware).get("/error", () => {
      throw new Error("Not Found");
    });

    await app.handle(new Request("http://localhost/error"));

    expect(logCalls.length).toBeGreaterThan(0);
    const logCall = logCalls[0];
    expect(logCall).toMatch(
      /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] GET http:\/\/localhost\/error - ERROR: Not Found - \d+ms/
    );
  });

  test("logs different status codes", async () => {
    const app = new Elysia().use(loggerMiddleware).get("/created", ({ set }) => {
      set.status = 201;
      return "created";
    });

    await app.handle(new Request("http://localhost/created"));

    expect(logCalls.length).toBeGreaterThan(0);
    const logCall = logCalls[0];
    expect(logCall).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] GET http:\/\/localhost\/created - 201 - \d+ms/);
  });
});
