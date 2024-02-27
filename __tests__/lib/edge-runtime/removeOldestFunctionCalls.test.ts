import { removeOldestFunctionCalls } from "../../../lib/edge-runtime/utils";
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
  content: "Cut for brevity",
  name: "longFunctionCall",
};
function getLongFunctionCall(numTokens: number): ChatGPTMessage {
  return {
    role: "function",
    content: new Array(numTokens + 1).join(" function"),
    name: "longFunctionCall",
  };
}

describe("removeOldestFunctionCalls", () => {
  it("should leave unchanged - not over context limit", () => {
    const out = removeOldestFunctionCalls([systemPrompt], "4");
    expect(out).toEqual([systemPrompt]);
  });
  it("should remove 1 function call", () => {
    const out = removeOldestFunctionCalls(
      [systemPrompt, getLongFunctionCall(9000)],
      "4",
    );
    expect(out).toEqual([systemPrompt, replacementFunctionMessage]);
  });
  it("should remove function call, leaving user and assistant messages (start)", () => {
    const out = removeOldestFunctionCalls(
      [
        systemPrompt,
        getLongFunctionCall(9000),
        userMessage,
        assistantMessage,
        userMessage,
        assistantMessage,
      ],
      "4",
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
    const out = removeOldestFunctionCalls(
      [
        systemPrompt,
        userMessage,
        assistantMessage,
        userMessage,
        assistantMessage,
        getLongFunctionCall(9000),
      ],
      "4",
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
    const out = removeOldestFunctionCalls(
      [
        systemPrompt,
        getLongFunctionCall(9000),
        userMessage,
        assistantMessage,
        getLongFunctionCall(10),
      ],
      "4",
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
    const out = removeOldestFunctionCalls(
      [
        systemPrompt,
        getLongFunctionCall(4500),
        getLongFunctionCall(4500),
        userMessage,
        assistantMessage,
        getLongFunctionCall(10),
      ],
      "4",
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
    const out = removeOldestFunctionCalls(
      [systemPrompt, getLongFunctionCall(5000)],
      "3",
    );
    expect(out).toEqual([systemPrompt, replacementFunctionMessage]);
  });

  it("should not remove long function 16k limit", () => {
    const out = removeOldestFunctionCalls(
      [systemPrompt, getLongFunctionCall(12000)],
      "3-16k",
    );
    expect(out).toEqual([systemPrompt, getLongFunctionCall(12000)]);
  });
  it("maxTokens works", () => {
    const out = removeOldestFunctionCalls(
      [systemPrompt, getLongFunctionCall(2000)],
      undefined,
      2000,
    );
    expect(out).toEqual([systemPrompt, replacementFunctionMessage]);
  });
});
