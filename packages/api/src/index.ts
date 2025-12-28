// packages/api/src/index.ts
import { os } from "@orpc/server";

import type { Context } from "./context";
import { authMiddleware } from "./middleware/auth";

export type { AuthenticatedContext, AuthUser, Context } from "./context";

/**
 * Base oRPC instance with context type.
 * All procedures start from here.
 */
export const o = os.$context<Context>();

/**
 * Public procedure - no authentication required.
 * Use for health checks, public data, etc.
 */
export const publicProcedure = o;

/**
 * Protected procedure - requires valid Supabase Bearer token.
 * User is guaranteed to be present in context.
 */
export const protectedProcedure = o.use(authMiddleware());
