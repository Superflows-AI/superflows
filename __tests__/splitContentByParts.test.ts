import { describe, expect, it } from "@jest/globals";
import { splitContentByParts } from "@superflows/chat-ui-react";

describe("splitContentByParts", () => {
  it("Does nothing to simple string", () => {
    const matches = splitContentByParts("Hello world");
    expect(matches).toEqual(["Hello world"]);
  });
  it("Splits on <button>", () => {
    const matches = splitContentByParts("Hello <button>world</button>");
    expect(matches).toEqual(["Hello ", "<button>world</button>"]);
  });
  it("Multiple <button>s", () => {
    const matches = splitContentByParts(
      "Hello <button>world</button>\n\n<button>You're looking</button>\n\n<button>good today</button>"
    );
    expect(matches).toStrictEqual([
      "Hello ",
      "<button>world</button>",
      "\n\n",
      "<button>You're looking</button>",
      "\n\n",
      "<button>good today</button>",
    ]);
  });
});
