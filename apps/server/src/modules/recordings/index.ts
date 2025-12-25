import { Elysia } from "elysia";
import { ForbiddenError, NotFoundError } from "../../shared/errors";
import { auth } from "../auth";
import { listQuerySchema, recordingIdParamSchema } from "./model";
import * as RecordingsService from "./service";

/**
 * Recordings controller (Elysia instance)
 * Handles HTTP routing, request validation, and response formatting
 */

export const recordings = new Elysia({
	prefix: "/recordings",
	name: "Recordings.Controller",
})
	.use(auth)
	.get(
		"/",
		async ({ user, query }) => {
			const limit = Number(query.limit) || 20;
			const offset = Number(query.offset) || 0;

			return await RecordingsService.listRecordings({
				userId: user.id,
				limit,
				offset,
			});
		},
		{
			query: listQuerySchema,
		},
	)
	.get(
		"/:id",
		async ({ user, params }) => {
			const result = await RecordingsService.getRecording({
				id: params.id,
				userId: user.id,
			});

			if (result.error === "not_found") {
				throw new NotFoundError("Recording not found", "RECORDING_NOT_FOUND");
			}

			if (result.error === "forbidden") {
				throw new ForbiddenError("Not authorized", "RECORDING_FORBIDDEN");
			}

			return { recording: result.recording };
		},
		{
			params: recordingIdParamSchema,
		},
	)
	.as("scoped");
