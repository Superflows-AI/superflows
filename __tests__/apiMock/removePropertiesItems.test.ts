import { describe, it, expect } from "@jest/globals";
import { removePropertiesItems } from "../../pages/api/mock/[...slug]";

describe("removePropertiesItems", () => {
  const expected = { out: 1, nowt: 2 };
  it("does nothing to nice output", () => {
    const out = removePropertiesItems(expected);
    expect(out).toEqual(expected);
  });
  it("nested in properties", () => {
    const out = removePropertiesItems({ properties: expected });
    expect(out).toEqual(expected);
  });
  it("nested in items", () => {
    const out = removePropertiesItems({ items: expected });
    expect(out).toEqual(expected);
  });
  it("double nested", () => {
    const out = removePropertiesItems({ properties: { items: expected } });
    expect(out).toEqual(expected);
  });
  it("double nested with 1 other entry", () => {
    const out = removePropertiesItems({
      properties: { items: expected },
      another: "one",
    });
    expect(out).toEqual({ ...expected, another: "one" });
  });
  it("double nested with multiple other entries", () => {
    const out = removePropertiesItems({
      properties: { items: expected, andAnother: "one" },
      another: "one",
    });
    expect(out).toEqual({ ...expected, another: "one", andAnother: "one" });
  });
  it("double nested with inner non-removed key", () => {
    const out = removePropertiesItems({
      properties: { key: expected, andAnother: "one" },
      another: "one",
    });
    expect(out).toEqual({ key: expected, another: "one", andAnother: "one" });
  });
  it("double nested with outer non-removed key", () => {
    const out = removePropertiesItems({
      key: { items: expected, andAnother: "one" },
      another: "one",
    });
    expect(out).toEqual({
      key: { ...expected, andAnother: "one" },
      another: "one",
    });
  });
  it("array of objects", () => {
    const out = removePropertiesItems([
      { items: expected },
      { items: expected },
      { items: expected },
    ]);
    expect(out).toEqual([expected, expected, expected]);
  });
  it("array of double-nested objects", () => {
    const out = removePropertiesItems([
      { items: { properties: expected } },
      { items: { properties: expected } },
      { items: { properties: expected } },
    ]);
    expect(out).toEqual([expected, expected, expected]);
  });
});
