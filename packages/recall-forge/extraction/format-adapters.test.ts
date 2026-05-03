import { describe, expect, it } from "vitest";
import { detectFormat } from "./format-adapters.js";

describe("OpenClaw session extraction", () => {
  it("detects the nested OpenClaw session message format", () => {
    const adapter = detectFormat({
      type: "message",
      ts: "2026-03-20T08:15:00.000Z",
      message: {
        role: "user",
        content: [{ type: "input_text", text: "Inspect the auth drift." }],
      },
    });

    expect(adapter.name).toBe("openclaw-session");
  });

  it("extracts nested text blocks from OpenClaw session content arrays", () => {
    const adapter = detectFormat({
      type: "message",
      ts: "2026-03-20T08:15:00.000Z",
      message: {
        role: "user",
        content: [
          { type: "input_text", text: "Inspect the auth drift." },
          { type: "output_text", text: "Summarize the parity mismatch." },
          {
            type: "tool_result",
            content: [
              { type: "text", text: "Tool output block" },
            ],
          },
        ],
      },
    });

    const records = adapter.extract(
      {
        type: "message",
        ts: "2026-03-20T08:15:00.000Z",
        message: {
          role: "user",
          content: [
            { type: "input_text", text: "Inspect the auth drift." },
            { type: "output_text", text: "Summarize the parity mismatch." },
            {
              type: "tool_result",
              content: [
                { type: "text", text: "Tool output block" },
              ],
            },
          ],
        },
      },
      7,
    );

    expect(records).toEqual([
      {
        text: "Inspect the auth drift.",
        role: "user",
        sourceFormat: "openclaw-session",
        lineNumber: 7,
        timestamp: "2026-03-20T08:15:00.000Z",
      },
      {
        text: "Summarize the parity mismatch.",
        role: "user",
        sourceFormat: "openclaw-session",
        lineNumber: 7,
        timestamp: "2026-03-20T08:15:00.000Z",
      },
      {
        text: "Tool output block",
        role: "user",
        sourceFormat: "openclaw-session",
        lineNumber: 7,
        timestamp: "2026-03-20T08:15:00.000Z",
      },
    ]);
  });
});
