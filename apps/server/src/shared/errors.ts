/**
 * Custom error types for consistent HTTP error handling
 */

export class HttpError extends Error {
	constructor(
		public readonly status: number,
		message: string,
		public readonly code?: string,
	) {
		super(message);
		this.name = "HttpError";
	}
}

export class UnauthorizedError extends HttpError {
	constructor(message = "Unauthorized", code?: string) {
		super(401, message, code);
		this.name = "UnauthorizedError";
	}
}

export class ForbiddenError extends HttpError {
	constructor(message = "Forbidden", code?: string) {
		super(403, message, code);
		this.name = "ForbiddenError";
	}
}

export class NotFoundError extends HttpError {
	constructor(message = "Not found", code?: string) {
		super(404, message, code);
		this.name = "NotFoundError";
	}
}

export class BadRequestError extends HttpError {
	constructor(message = "Bad request", code?: string) {
		super(400, message, code);
		this.name = "BadRequestError";
	}
}

export class InternalServerError extends HttpError {
	constructor(message = "Internal server error", code?: string) {
		super(500, message, code);
		this.name = "InternalServerError";
	}
}
