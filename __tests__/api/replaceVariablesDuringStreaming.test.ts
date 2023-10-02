import { replaceVariablesDuringStreaming } from "../../pages/api/v1/answers";

describe("replaceVariablesDuringStreaming", () => {
  it("no variables", () => {
    const out = replaceVariablesDuringStreaming(
      "This is a test string",
      "",
      {},
    );
    expect(out.content).toEqual("This is a test string");
    expect(out.valueVariableBuffer).toEqual("");
  });
  it("variable, but none in string", () => {
    const out = replaceVariablesDuringStreaming("This is a test string", "", {
      URL1: "https://google.com",
    });
    expect(out.content).toEqual("This is a test string");
    expect(out.valueVariableBuffer).toEqual("");
  });
  it("ID in string, but not at the end", () => {
    const out = replaceVariablesDuringStreaming("ID ", "", {
      URL1: "https://google.com",
    });
    expect(out.content).toEqual("ID ");
    expect(out.valueVariableBuffer).toEqual("");
  });
  it("variable, ID included", () => {
    const out = replaceVariablesDuringStreaming("ID", "", {
      URL1: "https://google.com",
    });
    expect(out.content).toEqual("");
    expect(out.valueVariableBuffer).toEqual("ID");
  });
  it("variable, buffer filled, no match", () => {
    const out = replaceVariablesDuringStreaming(" baby", "URL", {
      URL1: "https://google.com",
    });
    expect(out.content).toEqual("URL baby");
    expect(out.valueVariableBuffer).toEqual("");
  });
  it("variable, matches format, no match", () => {
    const out = replaceVariablesDuringStreaming("2 ", "URL", {
      URL1: "https://google.com",
    });
    expect(out.content).toEqual("URL2 ");
    expect(out.valueVariableBuffer).toEqual("");
  });
  it("URL variable, buffer filled, match", () => {
    const out = replaceVariablesDuringStreaming("1 ", "URL", {
      URL1: "https://google.com",
    });
    expect(out.content).toEqual("https://google.com ");
    expect(out.valueVariableBuffer).toEqual("");
  });
  it("ID variable, buffer filled, match", () => {
    const out = replaceVariablesDuringStreaming("2 ", "ID", {
      ID1: "ff3a5-3f3a5-3f3a5-3f3a5",
      ID2: "ff3a5-3f3a5-3f3a5-77877",
    });
    expect(out.content).toEqual("ff3a5-3f3a5-3f3a5-77877 ");
    expect(out.valueVariableBuffer).toEqual("");
  });
});