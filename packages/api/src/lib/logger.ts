import pino from "pino";

/**
 * Shared Pino logger instance.
 *
 * Uses pino-pretty for human-readable output in all environments.
 * All logs are structured JSON under the hood.
 */
export const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

/**
 * Create a child logger for a specific service.
 * Adds { service: "name" } to all log entries.
 *
 * @example
 * const log = createServiceLogger("recordings")
 * log.info({ recordingId: "abc" }, "Recording created")
 * // Output: INFO [recordings] Recording created { recordingId: "abc" }
 */
export function createServiceLogger(service: string) {
  return logger.child({ service });
}

export type Logger = typeof logger;
