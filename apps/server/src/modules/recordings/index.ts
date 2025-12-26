import { Elysia } from "elysia";
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
} from "../../shared/errors";
import { authMiddleware } from "../auth";
import {
	createRecordingBodySchema,
	listQuerySchema,
	processPendingQuerySchema,
	recordingIdParamSchema,
} from "./model";
import * as RecordingsService from "./service";

/**
 * Recordings controller (Elysia instance)
 * Handles HTTP routing, request validation, and response formatting
 */

export const recordings = new Elysia({
	prefix: "/recordings",
	name: "Recordings.Controller",
})
	.use(authMiddleware)
	.get(
		"/",
		async ({ query }) => {
			const limit = query.limit || 20;
			const offset = query.offset || 0;

			return await RecordingsService.listRecordings({
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
	.post(
		"/process-pending",
		async ({ query }) => {
			const limit = Number(query.limit) || 10;
			return await RecordingsService.processPendingRecordings(limit);
		},
		{
			query: processPendingQuerySchema,
		},
	)
	.post(
		"/",
		async ({ user, body }) => {
			const { file, durationSeconds, recordedAt } = body;

			const result = await RecordingsService.createAppRecording({
				userId: user.id,
				file,
				durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
				recordedAt: recordedAt ? new Date(recordedAt) : undefined,
			});

			if (result.error) {
				throw new BadRequestError(result.error, "UPLOAD_FAILED");
			}

			return { recording: result.recording };
		},
		{
			body: createRecordingBodySchema,
		},
	);
