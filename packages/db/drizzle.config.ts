import { createReluneEnv } from "@relune/config/env";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
	path: "../../apps/server/.env",
});

const env = createReluneEnv(process.env);

export default defineConfig({
	schema: "./src/schema",
	out: "./src/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
});
