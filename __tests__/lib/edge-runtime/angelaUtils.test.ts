import { parseOutput } from "@superflows/chat-ui-react";
import {
  stripExampleFunctions,
  updatePastAssistantMessage,
} from "../../../lib/edge-runtime/angelaUtils";
import { GPTMessageInclSummary } from "../../../lib/models";
import pokemon from "../../testData/pokemon.json";

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

describe("stripExampleFunctions", () => {
  it("Functions stripped from original prompt", () => {
    const res =
      stripExampleFunctions(`Reasoning: reason about how to achieve the user's request. Be concise. The user sees your reasoning as your 'thoughts'

Plan:
- short bulleted
- list that conveys
- long-term plan

Tell user: tell the user something. If you need to ask the user a question, do so here.

Commands:
FUNCTION_1(PARAM_1=VALUE_1, PARAM_2=VALUE_2, ...)
FUNCTION_2(PARAM_3=VALUE_3 ...)`);

    expect(res)
      .toEqual(`Reasoning: reason about how to achieve the user's request. Be concise. The user sees your reasoning as your 'thoughts'

Plan:
- short bulleted
- list that conveys
- long-term plan

Tell user: tell the user something. If you need to ask the user a question, do so here.

Commands:

`);
    expect(parseOutput(res).commands).toEqual([]);
  });
  it("long string without functions unchanged", () => {
    const s = JSON.stringify(pokemon);
    const res = stripExampleFunctions(s);
    expect(res).toEqual(s);
  });

  it("non example functions unchanged", () => {
    const s = `
    Commands:
    do_the_roar(monster=shrek)
    funcy_town(PARAM_1=VALUE_1, PARAM_2=VALUE_2, ...)
    FUNCTION_3(PARAM_1=VALUE_1, PARAM_2=VALUE_2, ...)
    `;
    const res = stripExampleFunctions(s);
    expect(res).toEqual(s);
  });
  it("Example functions with different arguments are stripped", () => {
    const s = `
    Commands:
    FUNCTION_1(A_WHOLE_NEW_PARAM=VALUE_1, ...)
    FUNCTION_2(A_WHOLE_NEW_PARAM2=VALUE_3, ...)
    `;
    const res = stripExampleFunctions(s);
    expect(res.trim()).toEqual("Commands:");
  });
});
