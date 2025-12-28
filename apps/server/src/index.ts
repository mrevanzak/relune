import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { env } from "@relune/env";
import { Elysia } from "elysia";
import { auth } from "./modules/auth";
import { importRoutes } from "./modules/import";
import { recordings } from "./modules/recordings";

const app = new Elysia()
	.use(
		cors({
			origin: env.CORS_ORIGIN,
			methods: ["GET", "POST", "OPTIONS"],
		}),
	)
	.use(
		openapi({
			enabled: env.ENABLE_SWAGGER,
			documentation: {
				info: {
					title: "Relune API",
					version: "0.0.0",
				},
			},
		}),
	)
	.get("/", () => "OK")
	.get("/health", () => ({ status: "ok" }))
	.use(auth)
	.use(recordings)
	.use(importRoutes)
	.listen(3000, () => {
		console.log("Server is running on http://localhost:3000");
	});

export type App = typeof app;

export default app;
