import { parseTellUser } from "../../../../lib/v2/prompts/utils";

describe("parseTellUser", () => {
  it("empty", () => {
    expect(parseTellUser("")).toEqual("");
  });
  it("no keyword", () => {
    expect(parseTellUser("hello")).toEqual("hello");
  });
  it("no keyword, multiple lines", () => {
    expect(parseTellUser("hello\nworld")).toEqual("hello\nworld");
  });
  it("Just tell user", () => {
    expect(parseTellUser("Tell user: hello")).toEqual("hello");
  });
  it("Other section, no tell user", () => {
    expect(parseTellUser("Thoughts: hello")).toEqual("");
  });
  it("Other section, tell user", () => {
    expect(parseTellUser("Thoughts: hello\nTell user: world")).toEqual("world");
  });
  it("Other section, tell user, multiple lines", () => {
    expect(parseTellUser("Thoughts: hello\nTell user: world\nworld")).toEqual(
      "world\nworld",
    );
  });
});
