/**
 * tool-result.ts — shared helper for emitting typed `AgentToolResult`s.
 *
 * The Pi SDK expects `AgentToolResult<TDetails>` with content (TextContent |
 * ImageContent) and a `details` blob. Most of our tools just need a single
 * text content entry plus a structured `details` object, so this helper
 * keeps the call sites short and consistent.
 *
 * Also contains the error-result constructor — when the scanner blocks, the
 * tool returns an error result (isError: true) with the scanner's reason in
 * the text content. That matches the contract: the model sees the block,
 * the UI logs the details, and no store write happens.
 */

import type { TextContent } from "@earendil-works/pi-ai";

export interface ToolResult<TDetails> {
  content: TextContent[];
  details: TDetails;
  isError?: boolean;
}

export function ok<TDetails>(
  details: TDetails,
  text: string,
): ToolResult<TDetails> {
  return {
    content: [{ type: "text", text }],
    details,
  };
}

export function err<TDetails>(
  details: TDetails,
  text: string,
): ToolResult<TDetails> {
  return {
    content: [{ type: "text", text }],
    details,
    isError: true,
  };
}