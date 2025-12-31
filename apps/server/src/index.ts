import { cors } from "@elysiajs/cors";
import { LoggingHandlerPlugin } from "@orpc/experimental-pino";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext } from "@relune/api/context";
import { logger } from "@relune/api/lib/logger";
import { appRouter } from "@relune/api/routers/index";
import { env } from "@relune/env";
import { Elysia } from "elysia";

/**
 * oRPC handlers for RPC and OpenAPI endpoints.
 *
 * RPCHandler: Handles type-safe RPC calls at /rpc/*
 * OpenAPIHandler: Provides OpenAPI documentation at /api/*
 */
const rpcHandler = new RPCHandler(appRouter, {
  plugins: [
    new LoggingHandlerPlugin({
      logger,
      generateId: () => crypto.randomUUID(),
      logRequestResponse: true,
      logRequestAbort: true,
    }),
  ],
});

const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
    new LoggingHandlerPlugin({
      logger,
      generateId: () => crypto.randomUUID(),
      logRequestResponse: true,
      logRequestAbort: true,
    }),
  ],
});

/**
 * Elysia server - thin wrapper that mounts oRPC handlers.
 *
 * Routes:
 * - GET /         : Health check
 * - ALL /rpc/*    : oRPC RPC handler (type-safe client calls)
 * - ALL /api/*    : OpenAPI handler (docs + REST-style calls)
 */
export const app = new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    })
  )
  .all("/rpc/*", async (context) => {
    const { response } = await rpcHandler.handle(context.request, {
      prefix: "/rpc",
      context: createContext(context.request.headers),
    });
    return response ?? new Response("Not Found", { status: 404 });
  })
  .all("/api/*", async (context) => {
    const { response } = await apiHandler.handle(context.request, {
      prefix: "/api",
      context: createContext(context.request.headers),
    });
    return response ?? new Response("Not Found", { status: 404 });
  })
  .get("/", () => "OK")
  .listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Server started");
    logger.info({ rpc: "/rpc", api: "/api" }, "Endpoints available");
  });

export type App = typeof app;
