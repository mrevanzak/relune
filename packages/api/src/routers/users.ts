import { protectedProcedure } from "../index";
import { createUserInput, updateDisplayNameInput } from "../models/users";
import * as UsersService from "../services/users";

/**
 * Users Router
 *
 * Endpoints for user management and profile.
 */
export const usersRouter = {
  /**
   * Get the current user's profile.
   */
  me: protectedProcedure.handler(({ context }) =>
    UsersService.getCurrentUser(context.user.id)
  ),

  /**
   * Update the current user's display name.
   */
  updateDisplayName: protectedProcedure
    .input(updateDisplayNameInput)
    .handler(({ context, input }) =>
      UsersService.updateDisplayName(context.user.id, input.displayName)
    ),

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
