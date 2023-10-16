import { describe, it, expect } from "@jest/globals";
import {
  deduplicateChunks,
  getParam,
  MessageInclSummaryToGPT,
} from "../../../lib/edge-runtime/utils";

describe("MessageInclSummaryToGPT", () => {
  it("user", () => {
    expect(
      MessageInclSummaryToGPT({
        role: "user",
        content: "hello",
      }),
    ).toEqual({
      role: "user",
      content: "hello",
    });
  });
  it("function, no summary", () => {
    expect(
      MessageInclSummaryToGPT({
        role: "function",
        name: "test",
        content: "hello",
      }),
    ).toEqual({
      role: "function",
      name: "test",
      content: "hello",
    });
  });
  it("function, summary", () => {
    expect(
      MessageInclSummaryToGPT({
        role: "function",
        name: "test",
        content:
          "very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very long string",
        summary: "long string",
      }),
    ).toEqual({
      role: "function",
      name: "test",
      content: "long string",
    });
  });
});

describe("getParam", () => {
  it("simple", () => {
    expect(getParam({ a: "b" }, "a")).toEqual("b");
  });
  it("simple miss", () => {
    expect(getParam({ a: "b" }, "b")).toEqual(undefined);
  });
  it("hyphen in key, not in parameters", () => {
    expect(getParam({ a_b: "b" }, "a-b")).toEqual("b");
  });
});

describe("deduplicateChunks", () => {
  it("no match", () => {
    const chunks = [
      {
        id: 12,
        page_url: "tta",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 1", "Chunk 2", "Chunk 3"],
        chunk_idx: 1,
        similarity: 1,
      },
      {
        id: 13,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 2", "Chunk 3", "Chunk 4"],
        chunk_idx: 2,
        similarity: 1,
      },
    ];

    const res = deduplicateChunks(chunks);

    expect(res).toEqual([
      {
        id: 12,
        page_url: "tta",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 1", "Chunk 2", "Chunk 3"],
        chunk_idx: 1,
        similarity: 1,
      },
      {
        id: 13,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 2", "Chunk 3", "Chunk 4"],
        chunk_idx: 2,
        similarity: 1,
      },
    ]);
  });
  it("duplicate - append to end", () => {
    const chunks = [
      {
        id: 12,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 1", "Chunk 2", "Chunk 3"],
        chunk_idx: 1,
        similarity: 1,
      },
      {
        id: 13,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 2", "Chunk 3", "Chunk 4"],
        chunk_idx: 2,
        similarity: 1,
      },
    ];

    const res = deduplicateChunks(chunks);

    expect(res).toEqual([
      {
        id: 12,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 1", "Chunk 2", "Chunk 3", "Chunk 4"],
        chunk_idx: 1,
        similarity: 1,
      },
    ]);
  });
  it("duplicate - append to start", () => {
    const chunks = [
      {
        id: 13,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 2", "Chunk 3", "Chunk 4"],
        chunk_idx: 2,
        similarity: 1,
      },
      {
        id: 12,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 1", "Chunk 2", "Chunk 3"],
        chunk_idx: 1,
        similarity: 1,
      },
    ];

    const res = deduplicateChunks(chunks);

    expect(res).toEqual([
      {
        id: 13,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 1", "Chunk 2", "Chunk 3", "Chunk 4"],
        chunk_idx: 2,
        similarity: 1,
      },
    ]);
  });
});
