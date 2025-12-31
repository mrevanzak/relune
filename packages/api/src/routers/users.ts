import { protectedProcedure } from "../index";
import { createUserInput } from "../models/users";
import * as UsersService from "../services/users";

/**
 * Users Router
 *
 * Endpoints for listing and creating users.
 */
export const usersRouter = {
  /**
   * List all users (id, email, displayName).
   */
  list: protectedProcedure.handler(() => UsersService.listUsers()),

  /**
   * Create a new "shadow" user (not tied to Supabase Auth).
   * Used for mapping imported recordings to people who haven't signed up yet.
   */
  create: protectedProcedure
    .input(createUserInput)
    .handler(({ input }) => UsersService.createUser(input)),
};
