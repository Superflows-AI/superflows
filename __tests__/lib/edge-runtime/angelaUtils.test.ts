import { updatePastAssistantMessage } from "../../../lib/edge-runtime/angelaUtils";
import { GPTMessageInclSummary } from "../../../lib/models";

describe("updatePastAssistantMessage", () => {
  it("simple", () => {
    const pastMessages: GPTMessageInclSummary[] = [
      {
        role: "assistant",
        content:
          "Reasoning:\nHere's some thinking\n\nPlan:\n- Go to the shops\n\nCommands:\ntest(a=b)",
      },
    ];
    updatePastAssistantMessage(
      {
        name: "test",
        args: {
          a: "b",
          anotherOne: "Second arg",
        },
      },
      pastMessages,
    );
    expect(pastMessages).toEqual([
      {
        role: "assistant",
        content:
          'Reasoning:\nHere\'s some thinking\n\nPlan:\n- Go to the shops\n\nCommands:\ntest(a="b", anotherOne="Second arg")',
      },
    ]);
  });
  it("4 past messages", () => {
    const pastMessages: GPTMessageInclSummary[] = [
      { role: "user", content: "Test my application" },
      {
        role: "assistant",
        content:
          "Reasoning:\nHere's some thinking\n\nPlan:\n- Go to the shops\n\nCommands:\ntest(a=b)",
      },
      {
        role: "function",
        name: "test",
        content: "This test was successful",
      },
      {
        role: "assistant",
        content:
          "Reasoning:\nHere's some thinking\n\nPlan:\n- Go to the shops\n\nCommands:\ntest(a=b)",
      },
    ];
    updatePastAssistantMessage(
      {
        name: "test",
        args: {
          a: "b",
          requiredArg: "Second arg",
        },
      },
      pastMessages,
    );
    expect(pastMessages).toEqual([
      { role: "user", content: "Test my application" },
      {
        role: "assistant",
        content:
          "Reasoning:\nHere's some thinking\n\nPlan:\n- Go to the shops\n\nCommands:\ntest(a=b)",
      },
      {
        role: "function",
        name: "test",
        content: "This test was successful",
      },
      {
        role: "assistant",
        content:
          'Reasoning:\nHere\'s some thinking\n\nPlan:\n- Go to the shops\n\nCommands:\ntest(a="b", requiredArg="Second arg")',
      },
    ]);
  });
  it("5 past messages, including 1 function call after last assistant message", () => {
    const pastMessages: GPTMessageInclSummary[] = [
      { role: "user", content: "Test my application" },
      {
        role: "assistant",
        content:
          "Reasoning:\nHere's some thinking\n\nPlan:\n- Go to the shops\n\nCommands:\ntest(a=b)",
      },
      {
        role: "function",
        name: "test",
        content: "This test was successful",
      },
      {
        role: "assistant",
        content:
          "Reasoning:\nHere's some thinking\n\nPlan:\n- Go to the shops\n\nCommands:\ntest(a=b)\nanother_test()",
      },
      {
        role: "function",
        name: "another_test",
        content: "This other test was successful",
      },
    ];
    updatePastAssistantMessage(
      {
        name: "test",
        args: {
          a: "b",
          requiredArg: "Second arg",
        },
      },
      pastMessages,
    );
    expect(pastMessages).toEqual([
      { role: "user", content: "Test my application" },
      {
        role: "assistant",
        content:
          "Reasoning:\nHere's some thinking\n\nPlan:\n- Go to the shops\n\nCommands:\ntest(a=b)",
      },
      {
        role: "function",
        name: "test",
        content: "This test was successful",
      },
      {
        role: "assistant",
        content:
          'Reasoning:\nHere\'s some thinking\n\nPlan:\n- Go to the shops\n\nCommands:\ntest(a="b", requiredArg="Second arg")\nanother_test()',
      },
      {
        role: "function",
        name: "another_test",
        content: "This other test was successful",
      },
    ]);
  });
  it("multiple new parameters", () => {
    const pastMessages: GPTMessageInclSummary[] = [
      { role: "user", content: "Test my application" },
      {
        role: "assistant",
        content:
          "Reasoning:\nHere's some thinking\n\nPlan:\n- Go to the shops\n\nCommands:\ntest(a=b)",
      },
      {
        role: "function",
        name: "test",
        content: "This test was successful",
      },
      {
        role: "assistant",
        content:
          "Reasoning:\nHere's some thinking\n\nPlan:\n- Go to the shops\n\nCommands:\ntest(a=b)\nanother_test()",
      },
      {
        role: "function",
        name: "another_test",
        content: "This other test was successful",
      },
    ];
    updatePastAssistantMessage(
      {
        name: "test",
        args: {
          a: "b",
          requiredArg: "Second arg",
          anotherRequiredArg: "Third arg",
        },
      },
      pastMessages,
    );
    expect(pastMessages).toEqual([
      { role: "user", content: "Test my application" },
      {
        role: "assistant",
        content:
          "Reasoning:\nHere's some thinking\n\nPlan:\n- Go to the shops\n\nCommands:\ntest(a=b)",
      },
      {
        role: "function",
        name: "test",
        content: "This test was successful",
      },
      {
        role: "assistant",
        content:
          'Reasoning:\nHere\'s some thinking\n\nPlan:\n- Go to the shops\n\nCommands:\ntest(a="b", requiredArg="Second arg", anotherRequiredArg="Third arg")\nanother_test()',
      },
      {
        role: "function",
        name: "another_test",
        content: "This other test was successful",
      },
    ]);
  });
});
