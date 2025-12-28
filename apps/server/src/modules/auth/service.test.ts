import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { createAuthPlugin } from "./service";

function createTestApp(options: Parameters<typeof createAuthPlugin>[0]) {
	return new Elysia()
		.use(
			createAuthPlugin({
				...options,
				// Skip DB provisioning in tests
				onUserAuthenticated: async () => {},
			}),
		)
		.get("/me", ({ user }) => ({ id: user.id, email: user.email ?? null }));
}

describe("auth middleware", () => {
	it("returns 401 when Authorization header is missing", async () => {
		const app = createTestApp({
			allowedEmails: [],
			getUser: async () => ({ user: null, error: null }),
		});

		const response = await app.handle(new Request("http://localhost/me"));
		expect(response.status).toBe(401);

		const body = await response.json();
		expect(body).toHaveProperty("error");
		expect(body.error).toHaveProperty("status", 401);
		expect(body.error).toHaveProperty("code", "MISSING_TOKEN");
	});

	it("returns 401 when Authorization scheme is not Bearer", async () => {
		const app = createTestApp({
			allowedEmails: [],
			getUser: async () => ({ user: null, error: null }),
		});

		const response = await app.handle(
			new Request("http://localhost/me", {
				headers: { Authorization: "Basic abc" },
			}),
		);

		expect(response.status).toBe(401);

		const body = await response.json();
		expect(body).toHaveProperty("error");
		expect(body.error).toHaveProperty("status", 401);
		expect(body.error).toHaveProperty("code", "MISSING_TOKEN");
	});

	it("returns 401 when token is invalid", async () => {
		const app = createTestApp({
			allowedEmails: [],
			getUser: async () => ({ user: null, error: new Error("invalid") }),
		});

		const response = await app.handle(
			new Request("http://localhost/me", {
				headers: { Authorization: "Bearer bad-token" },
			}),
		);

		expect(response.status).toBe(401);

		const body = await response.json();
		expect(body).toHaveProperty("error");
		expect(body.error).toHaveProperty("status", 401);
		expect(body.error).toHaveProperty("code", "INVALID_TOKEN");
	});

	it("returns 403 when email is not in whitelist", async () => {
		const app = createTestApp({
			allowedEmails: ["allowed@example.com"],
			getUser: async () => ({
				user: { id: "u1", email: "blocked@example.com" },
				error: null,
			}),
		});

		const response = await app.handle(
			new Request("http://localhost/me", {
				headers: { Authorization: "Bearer good-token" },
			}),
		);

		expect(response.status).toBe(403);

		const body = await response.json();
		expect(body).toHaveProperty("error");
		expect(body.error).toHaveProperty("status", 403);
		expect(body.error).toHaveProperty("code", "EMAIL_NOT_ALLOWED");
	});

	it("returns 200 when token is valid and email is allowed", async () => {
		const app = createTestApp({
			allowedEmails: ["allowed@example.com"],
			getUser: async () => ({
				user: { id: "u1", email: "allowed@example.com" },
				error: null,
			}),
		});

		const response = await app.handle(
			new Request("http://localhost/me", {
				headers: { Authorization: "Bearer good-token" },
			}),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			id: "u1",
			email: "allowed@example.com",
		});
	});
});
