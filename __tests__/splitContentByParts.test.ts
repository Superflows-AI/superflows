import { describe, expect, it } from "@jest/globals";
import { splitContentByParts } from "superflows-chatui";

describe("splitContentByParts", () => {
  it("Does nothing to simple string", () => {
    const matches = splitContentByParts("Hello world");
    expect(matches).toEqual(["Hello world"]);
  });
  it("Splits on <table>", () => {
    const matches = splitContentByParts("Hello <table>world</table>");
    expect(matches).toEqual(["Hello ", "<table>world</table>"]);
  });
  it("Splits on <button>", () => {
    const matches = splitContentByParts("Hello <button>world</button>");
    expect(matches).toEqual(["Hello ", "<button>world</button>"]);
  });
  it("Multiple <button>s & <table>s", () => {
    const matches = splitContentByParts(
      "Hello <button>world</button>\n\n<table>You're looking</table>\n\n<table>good today</table>"
    );
    expect(matches).toStrictEqual([
      "Hello ",
      "<button>world</button>",
      "\n\n",
      "<table>You're looking</table>",
      "\n\n",
      "<table>good today</table>",
    ]);
  });
});
