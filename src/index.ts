#!/usr/bin/env node

/**
 * DevScout MCP Server — Entry Point
 *
 * Bootstraps the MCP server with stdio transport for IDE integration.
 *
 * CRITICAL SAFETY MEASURES:
 * 1. console.log is globally redirected to stderr to prevent stdout pollution
 * 2. All logging goes through the stderr-only logger
 * 3. Process signals (SIGINT, SIGTERM) are handled for clean shutdown
 * 4. Unhandled rejections/exceptions are caught and logged to stderr
 *
 * This file should contain ONLY:
 * - stdout safety overrides
 * - Transport initialization
 * - Process lifecycle management
 *
 * All business logic lives in server.ts and downstream modules.
 */

// ══════════════════════════════════════════════════════════════════
// STDOUT SAFETY: Must be the VERY FIRST thing executed.
// Redirects any stray console.log (including from third-party packages)
// to stderr to prevent JSON-RPC stream corruption.
// ══════════════════════════════════════════════════════════════════
console.log = (...args: unknown[]) => {
  process.stderr.write(`[INTERCEPTED_LOG] ${args.map(String).join(" ")}\n`);
};

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { logger } from "./utils/logger.js";

/**
 * Initializes the server using stdio transport.
 *
 * The stdio transport binds the server's lifecycle to the parent IDE process.
 * When the IDE exits, OS pipes are dropped and SIGTERM is delivered,
 * triggering clean shutdown.
 */
async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  logger.info("DevScout MCP server active and listening over stdio.");
}

// ══════════════════════════════════════════════════════════════════
// PROCESS LIFECYCLE MANAGEMENT
// ══════════════════════════════════════════════════════════════════

/** Prevent double-shutdown race conditions */
let isShuttingDown = false;

function handleShutdown(signal: string): void {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`${signal} received. Shutting down DevScout MCP server.`);
  process.exit(0);
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

// Catch unhandled promise rejections (prevent silent crashes)
process.on("unhandledRejection", (reason: unknown) => {
  logger.error("Unhandled promise rejection", reason);
});

// Catch uncaught exceptions (prevent silent crashes)
process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught exception", error);
  process.exit(1);
});

// ══════════════════════════════════════════════════════════════════
// LAUNCH
// ══════════════════════════════════════════════════════════════════
main().catch((error: unknown) => {
  logger.error("Fatal initialization error", error);
  process.exit(1);
});
