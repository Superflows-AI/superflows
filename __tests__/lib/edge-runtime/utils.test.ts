import { describe, it, expect } from "@jest/globals";
import {
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
