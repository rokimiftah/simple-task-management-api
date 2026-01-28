import { initializeDatabase } from "./db/schema";
import { authRoutes } from "./routes/auth";
import { taskRoutes } from "./routes/tasks";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";

initializeDatabase();

const app = new Elysia()
  .use(authRoutes)
  .use(taskRoutes)
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }), {
    detail: { hide: true }
  })
  .use(
    openapi({
      path: "/docs",
      documentation: {
        info: {
          title: "EPLC - Simple Task Management API",
          version: "1.0.0",
          description:
            "REST API for a simple task management system with full CRUD functionality and token-based authentication. Created for EPLC online full stack developer test."
        },
        tags: [
          {
            name: "Authentication",
            description: "Endpoints for user registration and login"
          },
          {
            name: "Tasks",
            description: "Endpoints for CRUD operations on tasks"
          }
        ],
        components: {
          securitySchemes: {
            BearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "secret-token-123:USER_ID",
              description: "Bearer token authentication format: secret-token-123:USER_ID"
            }
          }
        },
        security: [
          {
            BearerAuth: []
          }
        ]
      },
      scalar: {
        theme: "default",
        layout: "modern",
        favicon: "https://cdn.rokimiftah.id/favicon.ico",
        showSidebar: false,
        defaultOpenAllTags: true,
        expandAllModelSections: true,
        expandAllResponses: true,
        hideClientButton: true,
        hideSearch: true,
        showDeveloperTools: "never",
        operationTitleSource: "summary",
        persistAuth: false,
        telemetry: false,
        debug: false,
        isEditable: false,
        isLoading: true,
        hideModels: false,
        documentDownloadType: "none",
        hideTestRequestButton: false,
        showOperationId: false,
        hideDarkModeToggle: true,
        withDefaultFonts: true,
        orderSchemaPropertiesBy: "preserve",
        orderRequiredPropertiesFirst: true,
        default: false,
        darkMode: true,
        forceDarkModeState: "dark",

        hiddenClients: {
          c: ["libcurl"],
          clojure: ["clj_http"],
          csharp: ["httpclient", "restsharp"],
          dart: ["http"],
          fsharp: ["httpclient"],
          go: ["native"],
          http: ["http1.1"],
          java: ["asynchttp", "nethttp", "okhttp", "unirest"],
          js: ["axios", "fetch", "jquery", "ofetch", "xhr"],
          kotlin: ["okhttp"],
          node: ["ofetch", "undici"],
          objc: ["nsurlsession"],
          ocaml: ["cohttp"],
          powershell: ["restmethod", "webrequest"],
          python: ["httpx_async", "httpx_sync", "python3", "requests"],
          r: ["httr"],
          ruby: ["native"],
          rust: ["reqwest"],
          shell: ["httpie", "wget"],
          swift: ["nsurlsession"]
        },
        customCss: `
          html, body {
            background-color: #0f0f0f !important;
          }
          :root {
            --scalar-background-1: #09090b;
            --scalar-background-2: #09090b;
          }
          ::-webkit-scrollbar {
            display: none;
          }
          * {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
        `
      }
    })
  )
  .get("/", ({ redirect }) => redirect("/docs"), { detail: { hide: true } })
  .listen(process.env.PORT ?? 3000);

console.log(`API Documentation: http://${app.server?.hostname}:${app.server?.port}/docs`);
