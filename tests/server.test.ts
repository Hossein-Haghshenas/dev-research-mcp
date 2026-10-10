import { describe, it, expect } from "vitest";
import { createServer } from "../src/server.js";

describe("Server Initialization", () => {
  it("initializes McpServer without throwing", () => {
    const server = createServer();
    expect(server).toBeDefined();
  });
});
