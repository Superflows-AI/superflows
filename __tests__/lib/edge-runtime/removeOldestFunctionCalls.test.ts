import { removeOldestMessages } from "../../../lib/edge-runtime/utils";
import { ChatGPTMessage } from "../../../lib/models";

const systemPrompt: ChatGPTMessage = {
  role: "system",
  content: "This is a system prompt.",
};
const userMessage: ChatGPTMessage = {
  role: "user",
  content: "This is a user message.",
};
const assistantMessage: ChatGPTMessage = {
  role: "assistant",
  content: "This is an assistant message.",
};
const replacementFunctionMessage: ChatGPTMessage = {
  role: "function",
  content: "Cut due to context limit",
  name: "longFunctionCall",
};
function getLongFunctionCall(numTokens: number): ChatGPTMessage {
  return {
    role: "function",
    content: new Array(numTokens + 1).join(" function"),
    name: "longFunctionCall",
  };
}
// I THOUGHT YOU COULD AND RANDO ROLES BUT YOU CANNT
const replacementDocumentationMessage: ChatGPTMessage = {
  role: "documentation",
  content: "Cut due to context limit",
};
function getLongDocumentation(numTokens: number): ChatGPTMessage {
  return {
    role: "documentation",
    content: new Array(numTokens + 1).join(" function"),
  };
}

describe("removeOldestFunctionCalls", () => {
  it("should leave unchanged - not over context limit", () => {
    const out = removeOldestMessages([systemPrompt], "4", "function");
    ("function");
    expect(out).toEqual([systemPrompt]);
  });
  it("should remove 1 function call", () => {
    const out = removeOldestMessages(
      [systemPrompt, getLongFunctionCall(9000)],
      "4",
      "function",
    );
    expect(out).toEqual([systemPrompt, replacementFunctionMessage]);
  });
  it("should remove function call, leaving user and assistant messages (start)", () => {
    const out = removeOldestMessages(
      [
        systemPrompt,
        getLongFunctionCall(9000),
        userMessage,
        assistantMessage,
        userMessage,
        assistantMessage,
      ],
      "4",
      "function",
    );
    expect(out).toEqual([
      systemPrompt,
      replacementFunctionMessage,
      userMessage,
      assistantMessage,
      userMessage,
      assistantMessage,
    ]);
  });
  it("should remove function call, leaving user and assistant messages (end)", () => {
    const out = removeOldestMessages(
      [
        systemPrompt,
        userMessage,
        assistantMessage,
        userMessage,
        assistantMessage,
        getLongFunctionCall(9000),
      ],
      "4",
      "function",
    );
    expect(out).toEqual([
      systemPrompt,
      userMessage,
      assistantMessage,
      userMessage,
      assistantMessage,
      replacementFunctionMessage,
    ]);
  });
  it("should remove 1 long call, leaving later short function call", () => {
    const out = removeOldestMessages(
      [
        systemPrompt,
        getLongFunctionCall(9000),
        userMessage,
        assistantMessage,
        getLongFunctionCall(10),
      ],
      "4",
      "function",
    );
    expect(out).toEqual([
      systemPrompt,
      replacementFunctionMessage,
      userMessage,
      assistantMessage,
      getLongFunctionCall(10),
    ]);
  });
  it("should remove 1st of 2 long ones", () => {
    const out = removeOldestMessages(
      [
        systemPrompt,
        getLongFunctionCall(4500),
        getLongFunctionCall(4500),
        userMessage,
        assistantMessage,
        getLongFunctionCall(10),
      ],
      "4",
      "function",
    );
    expect(out).toEqual([
      systemPrompt,
      replacementFunctionMessage,
      getLongFunctionCall(4500),
      userMessage,
      assistantMessage,
      getLongFunctionCall(10),
    ]);
  });
  it("should remove 1 function call 3k limit", () => {
    const out = removeOldestMessages(
      [systemPrompt, getLongFunctionCall(5000)],
      "3",
      "function",
    );
    expect(out).toEqual([systemPrompt, replacementFunctionMessage]);
  });
  it("should remove no functions, target documentation", () => {
    const out = removeOldestMessages(
      [systemPrompt, getLongFunctionCall(5000)],
      "3",
      "documentation",
    );
    expect(out).toEqual([systemPrompt, getLongFunctionCall(5000)]);
  });

  it("should not remove long function 16k limit", () => {
    const out = removeOldestMessages(
      [systemPrompt, getLongFunctionCall(12000)],
      "3-16k",
      "function",
    );
    expect(out).toEqual([systemPrompt, getLongFunctionCall(12000)]);
  });
  it("should remove documentation ", () => {
    const out = removeOldestMessages(
      [systemPrompt, getLongDocumentation(5000)],
      "3",
      "documentation",
    );
    expect(out).toEqual([systemPrompt, replacementDocumentationMessage]);
  });
});
