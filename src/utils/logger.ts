/**
 * Pure stderr logging wrapper.
 *
 * CRITICAL: In MCP stdio transport, stdout is the exclusive JSON-RPC channel.
 * Any stray output to stdout (fd 1) will corrupt the protocol stream and crash
 * the client connection. ALL logging MUST go through this module to stderr (fd 2).
 *
 * @see https://modelcontextprotocol.io/docs/concepts/transports#stdio
 */

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

function formatTimestamp(): string {
  return new Date().toISOString();
}

function write(level: LogLevel, msg: string, meta?: unknown): void {
  const timestamp = formatTimestamp();
  const metaStr = meta !== undefined
    ? ` ${meta instanceof Error ? meta.stack ?? meta.message : JSON.stringify(meta)}`
    : "";
  process.stderr.write(`[${timestamp}] [${level}] ${msg}${metaStr}\n`);
}

/**
 * Stderr-only logger for MCP stdio servers.
 *
 * Usage:
 * ```typescript
 * import { logger } from "./utils/logger.js";
 * logger.info("Server started");
 * logger.error("Search failed", error);
 * ```
 */
export const logger = {
  debug: (msg: string, meta?: unknown): void => write("DEBUG", msg, meta),
  info: (msg: string, meta?: unknown): void => write("INFO", msg, meta),
  warn: (msg: string, meta?: unknown): void => write("WARN", msg, meta),
  error: (msg: string, meta?: unknown): void => write("ERROR", msg, meta),
} as const;
