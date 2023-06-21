import { stripTrailingAndCurly } from "../../lib/utils";
import { describe, expect, it } from "@jest/globals";

describe("stripTrailingAndCurly", () => {
  it("should remove nothing", () => {
    expect(stripTrailingAndCurly("/api")).toBe("/api");
  });

  it("should remove trailing slashes", () => {
    expect(stripTrailingAndCurly("/api/")).toBe("/api");
  });

  it("should remove curly brackets", () => {
    expect(stripTrailingAndCurly("/api/{id}")).toBe("/api");
  });

  it("should remove trailing slashes and curly brackets", () => {
    expect(stripTrailingAndCurly("/api/{id}/")).toBe("/api");
  });
});
