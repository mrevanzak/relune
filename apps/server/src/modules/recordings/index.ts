import { Elysia } from "elysia";
import { errorResponseSchema } from "../../shared/errors";
import { authMiddleware } from "../auth";
import {
  createRecordingBodySchema,
  listQuerySchema,
  processPendingQuerySchema,
  recordingIdParamSchema,
  updateRecordingBodySchema,
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
      const search = query.search;

      return await RecordingsService.listRecordings({
        limit,
        offset,
        search,
      });
    },
    {
      query: listQuerySchema,
    }
  )
  .get(
    "/:id",
    async ({ params, status }) => {
      const result = await RecordingsService.getRecording({
        id: params.id,
      });

      if (result.error === "not_found") {
        return status(404, {
          message: "Recording not found",
          code: "RECORDING_NOT_FOUND",
          status: 404,
        });
      }

      if (result.error === "forbidden") {
        return status(403, {
          message: "Not authorized",
          code: "RECORDING_FORBIDDEN",
          status: 403,
        });
      }

      // After error checks, recording is guaranteed to be non-null
      return { recording: result.recording };
    },
    {
      params: recordingIdParamSchema,
      response: {
        403: errorResponseSchema,
        404: errorResponseSchema,
      },
    }
  )
  .post(
    "/process-pending",
    async ({ query }) => {
      const limit = Number(query.limit) || 10;
      return await RecordingsService.processPendingRecordings(limit);
    },
    {
      query: processPendingQuerySchema,
    }
  )
  .post(
    "/",
    async ({ user, body, status }) => {
      const { file, filename, durationSeconds, recordedAt } = body;

      const result = await RecordingsService.createAppRecording({
        userId: user.id,
        file,
        filename,
        durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
        recordedAt: recordedAt ? new Date(recordedAt) : undefined,
      });

      if (result.error) {
        return status(400, {
          message: result.error,
          code: "UPLOAD_FAILED",
          status: 400,
        });
      }

      // After error check, recording is guaranteed to be non-null
      return { recording: result.recording };
    },
    {
      body: createRecordingBodySchema,
      response: {
        400: errorResponseSchema,
      },
    }
  )
  .delete(
    "/:id",
    async ({ params, status }) => {
      const result = await RecordingsService.deleteRecording({
        id: params.id,
      });

      if (!result.success) {
        if (result.error === "not_found") {
          return status(404, {
            message: "Recording not found",
            code: "RECORDING_NOT_FOUND",
            status: 404,
          });
        }
        if (result.error === "forbidden") {
          return status(403, {
            message: "Not authorized",
            code: "RECORDING_FORBIDDEN",
            status: 403,
          });
        }
        return status(400, {
          message: result.error,
          code: "DELETE_FAILED",
          status: 400,
        });
      }

      return { success: true };
    },
    {
      params: recordingIdParamSchema,
      response: {
        400: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
      },
    }
  )
  .patch(
    "/:id",
    async ({ params, body, status }) => {
      const result = await RecordingsService.updateRecording({
        id: params.id,
        recordedAt: body.recordedAt ? new Date(body.recordedAt) : undefined,
        newKeywords: body.keywords,
      });

      if (result.error === "not_found") {
        return status(404, {
          message: "Recording not found",
          code: "RECORDING_NOT_FOUND",
          status: 404,
        });
      }

      if (result.error === "forbidden") {
        return status(403, {
          message: "Not authorized",
          code: "RECORDING_FORBIDDEN",
          status: 403,
        });
      }

      if (result.error) {
        return status(400, {
          message: result.error,
          code: "UPDATE_FAILED",
          status: 400,
        });
      }

      // After error checks, recording is guaranteed to be non-null
      return { recording: result.recording };
    },
    {
      params: recordingIdParamSchema,
      body: updateRecordingBodySchema,
      response: {
        400: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
      },
    }
  );
