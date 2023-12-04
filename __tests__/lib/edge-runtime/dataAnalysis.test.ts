import { getCalledActions } from "../../../lib/edge-runtime/dataAnalysis";
import { testActions } from "../../testActions";
import { FunctionMessage } from "../../../lib/models";
import { AssistantMessage } from "@superflows/chat-ui-react/dist/src/lib/types";

describe("getCalledActions", () => {
  const assistant: AssistantMessage = {
    role: "assistant",
    content: "Commands:\naction_a()",
  };
  const functionMessageA: FunctionMessage = {
    role: "function",
    name: "action_a",
    content: "{}",
  };
  it("1 called function", () => {
    const out = getCalledActions(
      [{ ...assistant, functionMessages: [functionMessageA] }],
      testActions,
    );
    expect(out).toEqual([
      {
        action: testActions[0],
        args: {},
        output: {},
      },
    ]);
  });
  it("2 called functions", () => {
    const assistant2: AssistantMessage = {
      role: "assistant",
      content: 'Commands:\naction_a()\naction_b(arg="test")',
    };
    const out = getCalledActions(
      [
        {
          ...assistant2,
          functionMessages: [
            functionMessageA,
            {
              role: "function",
              name: "action_b",
              content: '{"output": "I\'m here"}',
            },
          ],
        },
      ],
      testActions,
    );
    expect(out).toEqual([
      {
        action: testActions[0],
        args: {},
        output: {},
      },
      {
        action: testActions[1],
        args: { arg: "test" },
        output: { output: "I'm here" },
      },
    ]);
  });
  it("2 assistant messages, 3 called functions", () => {
    const assistant2: AssistantMessage = {
      role: "assistant",
      content: 'Commands:\naction_a()\naction_b(arg="test")',
    };
    const out = getCalledActions(
      [
        {
          ...assistant2,
          functionMessages: [
            functionMessageA,
            {
              role: "function",
              name: "action_b",
              content: '{"output": "I\'m here"}',
            },
          ],
        },
        {
          role: "assistant",
          content: "Commands:\naction_c()",
          functionMessages: [
            {
              role: "function",
              name: "action_c",
              content: '{"output": "A different output!"}',
            },
          ],
        },
      ],
      testActions,
    );
    expect(out).toEqual([
      {
        action: testActions[0],
        args: {},
        output: {},
      },
      {
        action: testActions[1],
        args: { arg: "test" },
        output: { output: "I'm here" },
      },
      {
        action: testActions[2],
        args: {},
        output: { output: "A different output!" },
      },
    ]);
  });
  it("3 assistant messages, 3 called functions (1 repeated)", () => {
    const assistant2: AssistantMessage = {
      role: "assistant",
      content: 'Commands:\naction_a()\naction_b(arg="test")',
    };
    const out = getCalledActions(
      [
        {
          ...assistant2,
          functionMessages: [
            functionMessageA,
            {
              role: "function",
              name: "action_b",
              content: '{"output": "I\'m here"}',
            },
          ],
        },
        {
          role: "assistant",
          content: "Commands:\naction_c()",
          functionMessages: [
            {
              role: "function",
              name: "action_c",
              content: '{"output": "A different output!"}',
            },
          ],
        },
        { ...assistant, functionMessages: [functionMessageA] },
      ],
      testActions,
    );
    expect(out).toEqual([
      // action_a not listed at the top because it gets called again with the same args later
      {
        action: testActions[1],
        args: { arg: "test" },
        output: { output: "I'm here" },
      },
      {
        action: testActions[2],
        args: {},
        output: { output: "A different output!" },
      },
      {
        action: testActions[0],
        args: {},
        output: {},
      },
    ]);
  });
});
