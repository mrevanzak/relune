import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { importRouter } from "./import";
import { recordingsRouter } from "./recordings";
import { senderMappingsRouter } from "./sender-mappings";
import { settingsRouter } from "./settings";
import { usersRouter } from "./users";

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
   * Recordings endpoints.
   * Requires authentication.
   */
  recordings: recordingsRouter,

  /**
   * Import endpoints.
   * Requires authentication.
   */
  import: importRouter,

  /**
   * Users endpoints.
   * Requires authentication.
   */
  users: usersRouter,

  /**
   * Settings endpoints.
   * Requires authentication.
   */
  settings: settingsRouter,

  /**
   * Sender mappings endpoints.
   * Requires authentication.
   */
  senderMappings: senderMappingsRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
