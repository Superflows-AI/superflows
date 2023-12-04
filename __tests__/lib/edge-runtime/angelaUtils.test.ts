import { parseOutput } from "@superflows/chat-ui-react";
import {
  getAssistantFnMessagePairs,
  stripExampleFunctions,
  updatePastAssistantMessage,
} from "../../../lib/edge-runtime/angelaUtils";
import { FunctionMessage, GPTMessageInclSummary } from "../../../lib/models";
import pokemon from "../../testData/pokemon.json";
import { AssistantMessage } from "@superflows/chat-ui-react/dist/src/lib/types";

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

describe("getAssistantFnMessagePairs", () => {
  const name = "name";
  const content = "content";
  const assistant1: AssistantMessage = { role: "assistant", content };
  const assistant2: AssistantMessage = {
    role: "assistant",
    content: content + "2",
  };
  const function1: FunctionMessage = { role: "function", name, content };
  const function2: FunctionMessage = {
    role: "function",
    name: "name2",
    content,
  };
  it("basic", () => {
    const out = getAssistantFnMessagePairs([assistant1, function1]);
    expect(out).toEqual([
      {
        role: "assistant",
        content,
        functionMessages: [function1],
      },
    ]);
  });
  it("2 function messages, 1 assistant message", () => {
    const out = getAssistantFnMessagePairs([assistant1, function1, function1]);
    expect(out).toEqual([
      {
        role: "assistant",
        content,
        functionMessages: [function1, function1],
      },
    ]);
  });
  it("3 function messages, 1 assistant message, order maintained", () => {
    const out = getAssistantFnMessagePairs([
      assistant1,
      function1,
      function2,
      function1,
    ]);
    expect(out).toEqual([
      {
        role: "assistant",
        content,
        functionMessages: [function1, function2, function1],
      },
    ]);
  });
  it("3 function messages, 2 assistant messages", () => {
    const out = getAssistantFnMessagePairs([
      assistant1,
      function1,
      assistant2,
      function2,
      function1,
    ]);
    expect(out).toEqual([
      {
        ...assistant1,
        functionMessages: [function1],
      },
      {
        ...assistant2,
        functionMessages: [function2, function1],
      },
    ]);
  });
  it("5 function messages, 4 assistant messages", () => {
    const out = getAssistantFnMessagePairs([
      assistant1,
      function1,
      assistant2,
      function2,
      function1,
      { role: "assistant", content: "content3" },
      function2,
      { role: "assistant", content: "content4" },
      function1,
    ]);
    expect(out).toEqual([
      {
        ...assistant1,
        functionMessages: [function1],
      },
      {
        ...assistant2,
        functionMessages: [function2, function1],
      },
      {
        role: "assistant",
        content: "content3",
        functionMessages: [function2],
      },
      {
        role: "assistant",
        content: "content4",
        functionMessages: [function1],
      },
    ]);
  });
});
