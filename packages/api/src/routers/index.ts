import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { recordingsRouter } from "./recordings";
import { todoRouter } from "./todo";

/**
 * Root application router.
 *
 * All sub-routers are composed here and exported as a single router.
 * The AppRouterClient type is used by the native app for type inference.
 *
 * @example Server usage:
 * ```typescript
 * const handler = new RPCHandler(appRouter);
 * ```
 *
 * @example Client usage:
 * ```typescript
 * const client: AppRouterClient = createORPCClient(link);
 * await client.recordings.list({ limit: 20 });
 * ```
 */
export const appRouter = {
  /**
   * Health check endpoint.
   * Returns "OK" if the server is running.
   */
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),

  /**
   * Todo endpoints (example/demo).
   */
  todo: todoRouter,

  /**
   * Recordings endpoints.
   * Requires authentication.
   */
  recordings: recordingsRouter,

  /**
   * Import endpoints.
   * Requires authentication.
   */
  import: importRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
