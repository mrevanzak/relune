import { protectedProcedure } from "../index";
import * as UsersService from "../services/users";

/**
 * Users Router
 *
 * Read-only endpoints for listing users (used by sender mapping dropdowns).
 */
export const usersRouter = {
  /**
   * List all users (id, email, displayName).
   */
  list: protectedProcedure.handler(() => UsersService.listUsers()),
};
