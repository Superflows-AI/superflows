import {
  getCalledActions,
  getRelevantMessages,
} from "../../../lib/edge-runtime/dataAnalysis";
import { testActions } from "../../testActions";
import { FunctionMessage } from "../../../lib/models";
import {
  AssistantMessage,
  UserMessage,
} from "@superflows/chat-ui-react/dist/src/lib/types";
import { dataAnalysisActionName } from "../../../lib/builtinActions";
import { checkCodeExecutionOutput } from "../../../lib/v2/edge-runtime/dataAnalysis";

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

describe("getRelevantMessages", () => {
  const userMessage: UserMessage = { role: "user", content: "Hello" };
  const assMsgOtherFnCalls: AssistantMessage = {
    role: "assistant",
    content: "Reasoning:\n\nCommands:\naction_a()",
  };
  const assMsgDataAnalysisCall: AssistantMessage = {
    role: "assistant",
    content: `Reasoning:

Commands:
${dataAnalysisActionName}()`,
  };
  const fnMsgNotAnalysis: FunctionMessage = {
    role: "function",
    name: "action_a",
    content: "{}",
  };
  const fnMsgDataAnalysis: FunctionMessage = {
    role: "function",
    name: dataAnalysisActionName,
    content: "{}",
  };
  it("basic", () => {
    const out = getRelevantMessages([
      userMessage,
      assMsgOtherFnCalls,
      fnMsgNotAnalysis,
    ]);
    expect(out).toEqual([assMsgOtherFnCalls, fnMsgNotAnalysis]);
  });
  it("basic, 2 query-response pairs", () => {
    const out = getRelevantMessages([
      userMessage,
      assMsgOtherFnCalls,
      fnMsgNotAnalysis,
      userMessage,
      assMsgOtherFnCalls,
      fnMsgNotAnalysis,
    ]);
    expect(out).toEqual([assMsgOtherFnCalls, fnMsgNotAnalysis]);
  });
  it("basic, 3 query-response pairs", () => {
    const out = getRelevantMessages([
      userMessage,
      assMsgOtherFnCalls,
      fnMsgNotAnalysis,
      userMessage,
      assMsgOtherFnCalls,
      fnMsgNotAnalysis,
      userMessage,
      assMsgOtherFnCalls,
      fnMsgNotAnalysis,
    ]);
    expect(out).toEqual([assMsgOtherFnCalls, fnMsgNotAnalysis]);
  });
  it("only data analysis called most recently, go to previous query-response pair", () => {
    const out = getRelevantMessages([
      userMessage,
      assMsgOtherFnCalls,
      fnMsgNotAnalysis,
      userMessage,
      assMsgDataAnalysisCall,
    ]);
    expect(out).toEqual([
      assMsgOtherFnCalls,
      fnMsgNotAnalysis,
      assMsgDataAnalysisCall,
    ]);
  });
  it("only data analysis called in most recent 2 query-response pairs, go back 3", () => {
    const out = getRelevantMessages([
      userMessage,
      assMsgOtherFnCalls,
      fnMsgNotAnalysis,
      userMessage,
      assMsgDataAnalysisCall,
      fnMsgDataAnalysis,
      userMessage,
      assMsgDataAnalysisCall,
    ]);
    expect(out).toEqual([
      assMsgOtherFnCalls,
      fnMsgNotAnalysis,
      assMsgDataAnalysisCall,
      assMsgDataAnalysisCall,
    ]);
  });
  it("no non data analysis function messages", () => {
    const out = getRelevantMessages([
      userMessage,
      assMsgDataAnalysisCall,
      fnMsgDataAnalysis,
      userMessage,
      assMsgDataAnalysisCall,
    ]);
    expect(out).toBe(null);
  });
});

describe("checkCodeExecutionOutput", () => {
  it("null", () => {
    expect(checkCodeExecutionOutput(null, 1)).toBe(false);
  });
  it("Only calls, no logs or plots", () => {
    expect(
      checkCodeExecutionOutput(
        [
          {
            type: "call",
            args: { name: "searchDeals", params: { query: "Larry" } },
          },
        ],
        1,
      ),
    ).toBe(false);
  });
  it("1 log", () => {
    expect(
      checkCodeExecutionOutput(
        [
          {
            type: "call",
            args: { name: "searchDeals", params: { query: "Larry" } },
          },
          {
            type: "log",
            args: { message: "This is a log message" },
          },
        ],
        1,
      ),
    ).toBe(true);
  });
  it("1 plot", () => {
    expect(
      checkCodeExecutionOutput(
        [
          {
            type: "plot",
            args: {
              type: "bar",
              title: "graph",
              data: [{ x: 1, y: 2 }],
              labels: { x: "a", y: "b" },
            },
          },
          {
            type: "call",
            args: { name: "searchDeals", params: { query: "Larry" } },
          },
        ],
        1,
      ),
    ).toBe(true);
  });
  it("Plot, no data", () => {
    expect(
      checkCodeExecutionOutput(
        [
          {
            type: "plot",
            args: {
              type: "bar",
              title: "graph",
              data: [],
              labels: { x: "a", y: "b" },
            },
          },
          {
            type: "call",
            args: { name: "searchDeals", params: { query: "Larry" } },
          },
        ],
        1,
      ),
    ).toBe(false);
  });
  it("API call & plot, borked data", () => {
    expect(
      checkCodeExecutionOutput(
        [
          {
            type: "call",
            args: {
              name: "getInventoryProjections",
              params: { includeProjections: "true" },
            },
          },
          {
            type: "plot",
            args: {
              title: "Stock Levels by Product Categories",
              type: "bar",
              data: [
                { category: "undefined", totalUnits: null, totalCost: null },
              ],
              labels: { x: "Product Category", y: "Total Units" },
            },
          },
        ],
        1,
      ),
    ).toEqual(false);
  });
});
