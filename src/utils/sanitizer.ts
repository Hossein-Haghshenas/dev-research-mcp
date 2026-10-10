/**
 * HTML sanitization and prompt injection neutralization utilities.
 *
 * External web content can contain:
 * 1. HTML/script/style tags that waste tokens
 * 2. Markdown control sequences that corrupt brief formatting
 * 3. Indirect prompt injection attempts targeting the AI agent
 *
 * This module strips all dangerous content before snippets enter the
 * brief assembly pipeline.
 */

import { MAX_SNIPPET_LENGTH } from "../config/constants.js";

/**
 * Strips all HTML tags from a string.
 */
export function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "");
}

/**
 * Collapses multiple whitespace characters (spaces, tabs, newlines) into single spaces.
 */
export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Removes potentially dangerous Markdown control sequences that could
 * interfere with the structured brief format.
 */
export function neutralizeMarkdownInjection(text: string): string {
  return text
    // Strip Markdown headings that could break brief structure
    .replace(/^#{1,6}\s/gm, "")
    // Strip HTML comments (could hide prompt injections)
    .replace(/<!--[\s\S]*?-->/g, "")
    // Strip code fence openers/closers
    .replace(/```[a-z]*/g, "")
    // Strip blockquote markers (could fake agent directives)
    .replace(/^>\s*/gm, "")
    // Neutralize potential system/instruction-like prefixes
    .replace(/\b(system|instruction|directive|ignore previous|forget|override)\s*:/gi, "[filtered]:");
}

/**
 * Full sanitization pipeline for external web content.
 *
 * Applies in order:
 * 1. HTML tag removal
 * 2. Whitespace normalization
 * 3. Markdown injection neutralization
 * 4. Length enforcement
 *
 * @param raw - The raw content from external source
 * @param maxLength - Maximum output length (defaults to MAX_SNIPPET_LENGTH)
 * @returns Sanitized, length-capped string safe for brief inclusion
 */
export function sanitizeSnippet(raw: string, maxLength: number = MAX_SNIPPET_LENGTH): string {
  const stripped = stripHtmlTags(raw);
  const collapsed = collapseWhitespace(stripped);
  const neutralized = neutralizeMarkdownInjection(collapsed);
  return neutralized.slice(0, maxLength);
}

/**
 * Resolves DuckDuckGo redirect URLs by extracting the actual destination
 * from the `uddg` query parameter.
 *
 * DuckDuckGo wraps result URLs in tracking redirects like:
 * `//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com&rut=...`
 *
 * @param rawUrl - The raw URL from DDG HTML search results
 * @returns The resolved canonical URL, or the original URL if no redirect found
 */
export function resolveRedirectUrl(rawUrl: string): string {
  if (!rawUrl.includes("uddg=")) {
    return rawUrl.trim();
  }

  const extractedParam = rawUrl.split("uddg=")[1]?.split("&")[0];
  if (extractedParam) {
    try {
      return decodeURIComponent(extractedParam);
    } catch {
      // If decoding fails, return the raw parameter
      return extractedParam;
    }
  }

  return rawUrl.trim();
}
