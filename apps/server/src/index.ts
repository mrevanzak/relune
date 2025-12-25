import "dotenv/config";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { auth } from "./middleware/auth";
import { recordingsRoutes } from "./routes/recordings";

const app = new Elysia()
	.use(
		cors({
			origin: process.env.CORS_ORIGIN || "",
			methods: ["GET", "POST", "OPTIONS"],
		}),
	)
	.get("/", () => "OK")
	.get("/health", () => ({ status: "ok" }))
	.use(auth)
	.get("/api/me", ({ user }) => ({ user }))
	.use(recordingsRoutes)
	.listen(3000, () => {
		console.log("Server is running on http://localhost:3000");
	});

export type App = typeof app;
