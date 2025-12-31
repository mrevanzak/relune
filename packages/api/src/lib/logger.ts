import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Shared Pino logger instance.
 *
 * - Development: pino-pretty for human-readable colored output
 * - Production: plain JSON (fast, no worker threads, log-aggregation friendly)
 */
export const logger = isDev
  ? pino({
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    })
  : pino();

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
