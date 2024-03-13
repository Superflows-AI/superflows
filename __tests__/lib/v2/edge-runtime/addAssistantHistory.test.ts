import { addAssistantHistory } from "../../../../lib/v2/edge-runtime/ai";
import { dataAnalysisActionName } from "../../../../lib/v2/builtinActions";

describe("addAssistantHistory", () => {
  it("1 message: do nothing", () => {
    expect(addAssistantHistory([{ role: "user", content: "Hello" }])).toEqual([
      { role: "user", content: "Hello" },
    ]);
  });
  it("DIRECT message history: do nothing", () => {
    expect(
      addAssistantHistory([
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
      ]),
    ).toEqual([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
    ]);
  });
  it("Don't add an assistant message after the last message", () => {
    expect(
      addAssistantHistory([
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
        { role: "user", content: "Hello" },
      ]),
    ).toEqual([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
      { role: "user", content: "Hello" },
    ]);
  });
  it("CODE message in history: add an assistant message", () => {
    expect(
      addAssistantHistory([
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
        { role: "user", content: "Hello", chat_summary: "Hi there!" },
        {
          role: "function",
          content: "Logs from data analysis:\nPlot generated successfully",
          name: dataAnalysisActionName,
        },
        { role: "assistant", content: "Above is explained" },
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
      ]),
    ).toEqual([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
      { role: "user", content: "Hello", chat_summary: "Hi there!" },
      {
        role: "assistant",
        content: `Commands:
${dataAnalysisActionName}(instruction="Hi there!")`,
      },
      {
        role: "function",
        content: "Logs from data analysis:\nPlot generated successfully",
        name: dataAnalysisActionName,
      },
      { role: "assistant", content: "Above is explained" },
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
    ]);
  });
  it("CODE message - first message, no chat_history: add an assistant message", () => {
    expect(
      addAssistantHistory([
        { role: "user", content: "Hello" },
        {
          role: "function",
          content: "Logs from data analysis:\nPlot generated successfully",
          name: dataAnalysisActionName,
        },
        { role: "assistant", content: "Above is explained" },
        { role: "user", content: "Hello" },
      ]),
    ).toEqual([
      { role: "user", content: "Hello" },
      {
        role: "assistant",
        content: `Commands:
${dataAnalysisActionName}(instruction="Hello")`,
      },
      {
        role: "function",
        content: "Logs from data analysis:\nPlot generated successfully",
        name: dataAnalysisActionName,
      },
      { role: "assistant", content: "Above is explained" },
      { role: "user", content: "Hello" },
    ]);
  });
});
