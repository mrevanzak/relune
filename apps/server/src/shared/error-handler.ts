import { Elysia } from "elysia";
import { HttpError } from "./errors";

/**
 * Global error handler plugin using Elysia's onError lifecycle
 * Provides consistent error responses and logging
 */

type ErrorResponse = {
	error: {
		message: string;
		code?: string;
		status: number;
	};
};

export const errorHandler = new Elysia({ name: "ErrorHandler" }).onError(
	({ code, error, set }) => {
		// Ensure JSON response
		set.headers["content-type"] = "application/json";

		// Handle HttpError (our custom errors)
		if (error instanceof HttpError) {
			set.status = error.status;
			return {
				error: {
					message: error.message,
					code: error.code,
					status: error.status,
				},
			} satisfies ErrorResponse;
		}

		// Handle Elysia validation errors
		if (code === "VALIDATION") {
			set.status = 400;
			return {
				error: {
					message: "Validation failed",
					code: "VALIDATION_ERROR",
					status: 400,
				},
			} satisfies ErrorResponse;
		}

		// Handle NOT_FOUND errors (route not found)
		if (code === "NOT_FOUND") {
			set.status = 404;
			return {
				error: {
					message: "Route not found",
					code: "NOT_FOUND",
					status: 404,
				},
			} satisfies ErrorResponse;
		}

		// Handle other Elysia error codes
		if (code === "PARSE") {
			set.status = 400;
			return {
				error: {
					message: "Failed to parse request body",
					code: "PARSE_ERROR",
					status: 400,
				},
			} satisfies ErrorResponse;
		}

		if (code === "INVALID_COOKIE_SIGNATURE") {
			set.status = 401;
			return {
				error: {
					message: "Invalid cookie signature",
					code: "INVALID_COOKIE",
					status: 401,
				},
			} satisfies ErrorResponse;
		}

		// Log unexpected errors (don't expose internal details to client)
		console.error("Unexpected error:", error);

		set.status = 500;
		return {
			error: {
				message: "Internal server error",
				code: "INTERNAL_ERROR",
				status: 500,
			},
		} satisfies ErrorResponse;
	},
);
