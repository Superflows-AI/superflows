import { replacePlaceholdersDuringStreaming } from "../../pages/api/v1/answers";

describe("replacePlaceholdersDuringStreaming", () => {
  it("no placeholders", () => {
    const out = replacePlaceholdersDuringStreaming(
      "This is a test string",
      "",
      {},
    );
    expect(out.content).toEqual("This is a test string");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("placeholder, but none in string", () => {
    const out = replacePlaceholdersDuringStreaming(
      "This is a test string",
      "",
      {
        URL1: "https://google.com",
      },
    );
    expect(out.content).toEqual("This is a test string");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("ID in string, but not at the end", () => {
    const out = replacePlaceholdersDuringStreaming("ID ", "", {
      URL1: "https://google.com",
    });
    expect(out.content).toEqual("ID ");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("placeholder, ID included", () => {
    const out = replacePlaceholdersDuringStreaming("ID", "", {
      URL1: "https://google.com",
    });
    expect(out.content).toEqual("");
    expect(out.placeholderBuffer).toEqual("ID");
  });
  it("placeholder, buffer filled, no match", () => {
    const out = replacePlaceholdersDuringStreaming(" baby", "URL", {
      URL1: "https://google.com",
    });
    expect(out.content).toEqual("URL baby");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("placeholder, matches format, no match", () => {
    const out = replacePlaceholdersDuringStreaming("2 ", "URL", {
      URL1: "https://google.com",
    });
    expect(out.content).toEqual("URL2 ");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("placeholder in 1 chunk, match", () => {
    const out = replacePlaceholdersDuringStreaming("content=URL1 ", "", {
      URL1: "https://google.com",
    });
    expect(out.content).toEqual("content=https://google.com ");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("URL, buffer filled, match", () => {
    const out = replacePlaceholdersDuringStreaming("1 ", "URL", {
      URL1: "https://google.com",
    });
    expect(out.content).toEqual("https://google.com ");
    expect(out.placeholderBuffer).toEqual("");
  });
  it("ID, buffer filled, match", () => {
    const out = replacePlaceholdersDuringStreaming("2 ", "ID", {
      ID1: "ff3a5-3f3a5-3f3a5-3f3a5",
      ID2: "ff3a5-3f3a5-3f3a5-77877",
    });
    expect(out.content).toEqual("ff3a5-3f3a5-3f3a5-77877 ");
    expect(out.placeholderBuffer).toEqual("");
  });
});
