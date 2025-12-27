import { db } from "@relune/db";
import { users } from "@relune/db/schema";
import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { ForbiddenError, UnauthorizedError } from "../../shared/errors";

export type AuthUser = {
	id: string;
	email?: string | null;
};

export type GetUserResult = {
	user: AuthUser | null;
	error: unknown | null;
};

export type GetUserFn = (token: string) => Promise<GetUserResult>;

export type CreateAuthPluginOptions = {
	getUser: GetUserFn;
	allowedEmails?: string[];
};

function normalizeEmail(email: string | null | undefined): string | null {
	const normalized = email?.trim().toLowerCase();
	return normalized ? normalized : null;
}

/**
 * Ensure user exists in the public.users table.
 * Creates the user row if it doesn't exist (just-in-time provisioning).
 * This is needed because Supabase Auth users are separate from our app's users table.
 */
async function ensureUserExists(user: AuthUser): Promise<void> {
	const existing = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.id, user.id))
		.limit(1);

	if (existing.length === 0) {
		await db.insert(users).values({
			id: user.id,
			email: user.email ?? "",
		});
	}
}

/**
 * Extract Bearer token from Authorization header
 * Returns null if header is missing or malformed
 */
function extractBearerToken(authHeader: string | null): string | null {
	if (!authHeader) {
		return null;
	}

	// Case-insensitive match for "Bearer" prefix
	const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
	if (!bearerMatch) {
		return null;
	}

	const token = bearerMatch[1]?.trim();
	return token || null;
}

export function createAuthPlugin({
	getUser,
	allowedEmails = [],
}: CreateAuthPluginOptions) {
	const whitelist = allowedEmails
		.map((email) => normalizeEmail(email))
		.filter((email): email is string => Boolean(email));

	return new Elysia({ name: "Auth.Service" })
		.error({
			UNAUTHORIZED: UnauthorizedError,
			FORBIDDEN: ForbiddenError,
		})
		.onError({ as: "scoped" }, ({ error, set }) => {
			if (error instanceof UnauthorizedError) {
				set.status = 401;
				return {
					error: {
						message: error.message,
						code: error.code,
						status: 401,
					},
				};
			}

			if (error instanceof ForbiddenError) {
				set.status = 403;
				return {
					error: {
						message: error.message,
						code: error.code,
						status: 403,
					},
				};
			}
		})
		.derive({ as: "scoped" }, async (context) => {
			const { request } = context;

			// If upstream already derived a user, reuse it (prevents double Supabase calls)
			const existingUser = (context as { user?: AuthUser }).user;
			if (existingUser) {
				if (whitelist.length > 0) {
					const userEmail = normalizeEmail(existingUser.email);
					if (!userEmail || !whitelist.includes(userEmail)) {
						throw new ForbiddenError(
							"Email not authorized",
							"EMAIL_NOT_ALLOWED",
						);
					}
				}

				// Ensure user exists in public.users table
				await ensureUserExists(existingUser);

				return { user: existingUser };
			}

			const token = extractBearerToken(request.headers.get("Authorization"));

			if (!token) {
				throw new UnauthorizedError(
					"No authorization header or invalid Bearer token format",
					"MISSING_TOKEN",
				);
			}

			try {
				const { user, error } = await getUser(token);

				if (error || !user) {
					throw new UnauthorizedError("Invalid token", "INVALID_TOKEN");
				}

				if (whitelist.length > 0) {
					const userEmail = normalizeEmail(user.email);
					if (!userEmail || !whitelist.includes(userEmail)) {
						throw new ForbiddenError(
							"Email not authorized",
							"EMAIL_NOT_ALLOWED",
						);
					}
				}

				// Ensure user exists in public.users table (just-in-time provisioning)
				await ensureUserExists(user);

				return { user };
			} catch (error) {
				// Re-throw HttpError instances as-is
				if (
					error instanceof UnauthorizedError ||
					error instanceof ForbiddenError
				) {
					throw error;
				}

				// Wrap unexpected errors
				throw new UnauthorizedError("Authentication failed", "AUTH_FAILED");
			}
		});
}
