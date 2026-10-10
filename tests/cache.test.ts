import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryCache } from "../src/services/cache/memory-cache.js";

describe("MemoryCache", () => {
  let cache: MemoryCache<string>;

  beforeEach(() => {
    cache = new MemoryCache<string>(3, 1000); // max 3 items, 1s TTL
  });

  it("stores and retrieves cached values", () => {
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
    expect(cache.has("key1")).toBe(true);
  });

  it("returns undefined for missing keys", () => {
    expect(cache.get("missing")).toBeUndefined();
    expect(cache.has("missing")).toBe(false);
  });

  it("expires entries after TTL", async () => {
    cache.set("key1", "value1", 50); // 50ms TTL
    expect(cache.get("key1")).toBe("value1");

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(cache.get("key1")).toBeUndefined();
    expect(cache.has("key1")).toBe(false);
  });

  it("evicts oldest entries when exceeding maxEntries (LRU)", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");
    expect(cache.size).toBe(3);

    // Access 'a' to make it most recently used
    cache.get("a");

    // Add 'd', which should evict 'b' (oldest unaccessed)
    cache.set("d", "4");
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe("1");
    expect(cache.get("c")).toBe("3");
    expect(cache.get("d")).toBe("4");
  });

  it("supports manual deletion and clearing", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    expect(cache.delete("a")).toBe(true);
    expect(cache.get("a")).toBeUndefined();

    cache.clear();
    expect(cache.size).toBe(0);
  });
});
