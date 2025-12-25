import "dotenv/config";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { auth } from "./modules/auth";
import { recordings } from "./modules/recordings";
import { getEnv } from "./shared/env";
import { errorHandler } from "./shared/error-handler";

const app = new Elysia().use(errorHandler).use(
	cors({
		origin: getEnv("CORS_ORIGIN"),
		methods: ["GET", "POST", "OPTIONS"],
	}),
);

if (getEnv("ENABLE_SWAGGER") === "true") {
	app.use(
		swagger({
			path: "/swagger",
			documentation: {
				info: {
					title: "Relune API",
					version: "0.0.0",
				},
			},
		}),
	);
}

app
	.get("/", () => "OK")
	.get("/health", () => ({ status: "ok" }))
	.use(auth)
	.use(recordings)
	.listen(3000, () => {
		console.log("Server is running on http://localhost:3000");
	});

export type App = typeof app;
