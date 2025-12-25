import { db } from "@relune/db";
import { recordings } from "@relune/db/schema";
import { desc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { auth } from "../middleware/auth";

export const recordingsRoutes = new Elysia({ prefix: "/recordings" })
	.use(auth)
	.get(
		"/",
		async ({ user, query }) => {
			const limit = Number(query.limit) || 20;
			const offset = Number(query.offset) || 0;

			const results = await db
				.select()
				.from(recordings)
				.where(eq(recordings.userId, user.id))
				.orderBy(desc(recordings.recordedAt))
				.limit(limit)
				.offset(offset);

			return { recordings: results, limit, offset };
		},
		{
			query: t.Object({
				limit: t.Optional(t.String()),
				offset: t.Optional(t.String()),
			}),
		},
	)
	.get(
		"/:id",
		async ({ user, params, set }) => {
			const result = await db
				.select()
				.from(recordings)
				.where(eq(recordings.id, params.id))
				.limit(1);

			const recording = result[0];

			if (!recording) {
				set.status = 404;
				throw new Error("Recording not found");
			}

			if (recording.userId !== user.id) {
				set.status = 403;
				throw new Error("Not authorized");
			}

			return { recording };
		},
		{
			params: t.Object({
				id: t.String(),
			}),
		},
	)
	.as("scoped");
