/**
 * In-memory TTL cache for query deduplication.
 *
 * AI agents in continuous coding sessions frequently issue near-identical
 * queries within short timeframes. This cache prevents redundant network
 * requests to DuckDuckGo and GitHub, reducing rate limit pressure and
 * improving response latency.
 *
 * Design decisions:
 * - Simple Map-based LRU with TTL expiration (no external dependencies)
 * - Max 100 entries to keep memory footprint negligible
 * - 10-minute TTL balances freshness vs. request savings
 * - Lazy eviction: expired entries are cleaned on access, not via timers
 */

import { CACHE_MAX_ENTRIES, CACHE_TTL_MS } from "../../config/constants.js";
import { logger } from "../../utils/logger.js";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache<T = unknown> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(
    maxEntries: number = CACHE_MAX_ENTRIES,
    ttlMs: number = CACHE_TTL_MS,
  ) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  /**
   * Retrieves a cached value if it exists and hasn't expired.
   * Expired entries are lazily evicted on access.
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      logger.debug(`Cache expired: "${key}"`);
      return undefined;
    }

    // Move to end for LRU ordering (Map preserves insertion order)
    this.store.delete(key);
    this.store.set(key, entry);

    return entry.value;
  }

  /**
   * Stores a value in the cache with automatic TTL.
   * Evicts the oldest entry if the cache is at capacity.
   */
  set(key: string, value: T, ttlOverrideMs?: number): void {
    // If key already exists, delete it first to refresh position
    if (this.store.has(key)) {
      this.store.delete(key);
    }

    // Evict oldest entry if at capacity
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
        logger.debug(`Cache evicted oldest: "${oldestKey}"`);
      }
    }

    const duration = ttlOverrideMs !== undefined ? ttlOverrideMs : this.ttlMs;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + duration,
    });
  }

  /**
   * Removes a specific key from the cache.
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Checks if a key exists in the cache (without extending LRU position).
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Removes all entries from the cache.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Returns the current number of (potentially expired) entries.
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Purges all expired entries. Useful for periodic maintenance.
   */
  purgeExpired(): number {
    const now = Date.now();
    let purged = 0;

    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        purged++;
      }
    }

    if (purged > 0) {
      logger.debug(`Cache purged ${purged} expired entries`);
    }

    return purged;
  }
}
