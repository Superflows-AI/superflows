import {
  getDataAnalysisPrompt,
  getVarNames,
} from "../../lib/prompts/dataAnalysis";
import { exampleRequestBody2 } from "./testData";
import { Action } from "../../lib/types";
import { getIntroText } from "../../lib/prompts/chatBot";

describe("getVarNames", () => {
  it("1 varName", () => {
    const calledActions = [
      {
        action: {
          name: "action1",
          description: "description1",
          parameters: [],
          request_body_contents: null,
          responses: {
            "200": {
              content: exampleRequestBody2,
            },
          },
        } as unknown as Action,
        args: {},
        output: {
          accountId: "accountId",
          globalPermissions: ["1", "2", "3"],
          projectPermissions: [
            {
              issues: [5, 4, 3, 2],
              permissions: ["1", "2", "3"],
              projects: [1, 2, 3, 4],
            },
          ],
        },
      },
    ];
    const varNames = getVarNames(calledActions);
    expect(varNames).toEqual(["action1Output"]);
  });
  it("2 varNames - no clash", () => {
    const calledActions = [
      {
        action: {
          name: "action1",
          description: "description1",
          parameters: [],
          request_body_contents: null,
          responses: {
            "200": {
              content: exampleRequestBody2,
            },
          },
        } as unknown as Action,
        args: {},
        output: {
          accountId: "accountId",
          globalPermissions: ["1", "2", "3"],
          projectPermissions: [
            {
              issues: [5, 4, 3, 2],
              permissions: ["1", "2", "3"],
              projects: [1, 2, 3, 4],
            },
          ],
        },
      },
      {
        action: {
          name: "action2",
          description: "description1",
          parameters: [],
          request_body_contents: null,
          responses: {
            "200": {
              content: exampleRequestBody2,
            },
          },
        } as unknown as Action,
        args: { arg: 0 },
        output: {
          accountId: "accountId",
          globalPermissions: ["1", "2", "3"],
          projectPermissions: [
            {
              issues: [5, 4, 3, 2],
              permissions: ["1", "2", "3"],
              projects: [1, 2, 3, 4],
            },
          ],
        },
      },
    ];
    const varNames = getVarNames(calledActions);
    expect(varNames).toEqual(["action1Output", "action2Output"]);
  });
  it("2 varNames - clash", () => {
    const calledActions = [
      {
        action: {
          name: "action1",
          description: "description1",
          parameters: [],
          request_body_contents: null,
          responses: {
            "200": {
              content: exampleRequestBody2,
            },
          },
        } as unknown as Action,
        args: {},
        output: {
          accountId: "accountId",
          globalPermissions: ["1", "2", "3"],
          projectPermissions: [
            {
              issues: [5, 4, 3, 2],
              permissions: ["1", "2", "3"],
              projects: [1, 2, 3, 4],
            },
          ],
        },
      },
      {
        action: {
          name: "action1",
          description: "description1",
          parameters: [],
          request_body_contents: null,
          responses: {
            "200": {
              content: exampleRequestBody2,
            },
          },
        } as unknown as Action,
        args: { arg: 0 },
        output: {
          accountId: "accountId",
          globalPermissions: ["1", "2", "3"],
          projectPermissions: [
            {
              issues: [5, 4, 3, 2],
              permissions: ["1", "2", "3"],
              projects: [1, 2, 3, 4],
            },
          ],
        },
      },
    ];
    const varNames = getVarNames(calledActions);
    expect(varNames).toEqual(["action1Output", "action1Arg0"]);
  });
  it("3 varName - clash", () => {
    const calledActions = [
      {
        action: {
          name: "action1",
          description: "description1",
          parameters: [],
          request_body_contents: null,
          responses: {
            "200": {
              content: exampleRequestBody2,
            },
          },
        } as unknown as Action,
        args: {},
        output: {
          accountId: "accountId",
          globalPermissions: ["1", "2", "3"],
          projectPermissions: [
            {
              issues: [5, 4, 3, 2],
              permissions: ["1", "2", "3"],
              projects: [1, 2, 3, 4],
            },
          ],
        },
      },
      {
        action: {
          name: "action1",
          description: "description1",
          parameters: [],
          request_body_contents: null,
          responses: {
            "200": {
              content: exampleRequestBody2,
            },
          },
        } as unknown as Action,
        args: { arg: 0 },
        output: {
          accountId: "accountId",
          globalPermissions: ["1", "2", "3"],
          projectPermissions: [
            {
              issues: [5, 4, 3, 2],
              permissions: ["1", "2", "3"],
              projects: [1, 2, 3, 4],
            },
          ],
        },
      },
      {
        action: {
          name: "action1",
          description: "description1",
          parameters: [],
          request_body_contents: null,
          responses: {
            "200": {
              content: exampleRequestBody2,
            },
          },
        } as unknown as Action,
        args: { another: 77 },
        output: {
          accountId: "accountId",
          globalPermissions: ["1", "2", "3"],
          projectPermissions: [
            {
              issues: [5, 4, 3, 2],
              permissions: ["1", "2", "3"],
              projects: [1, 2, 3, 4],
            },
          ],
        },
      },
    ];
    const varNames = getVarNames(calledActions);
    expect(varNames).toEqual([
      "action1Output",
      "action1Arg0",
      "action1Another77",
    ]);
  });
});

describe("dataAnalysisPrompt", () => {
  it("basic", () => {
    const command = "If you can keep your head";
    const orgInfo = { name: "orgName", description: "orgDescription" };
    const calledActions = [
      {
        action: {
          name: "action1",
          description: "description1",
          parameters: [],
          request_body_contents: null,
          responses: {
            "200": {
              content: exampleRequestBody2,
            },
          },
        } as unknown as Action,
        args: [],
        output: {
          accountId: "accountId",
          globalPermissions: ["1", "2", "3"],
          projectPermissions: [
            {
              issues: [5, 4, 3, 2],
              permissions: ["1", "2", "3"],
              projects: [1, 2, 3, 4],
            },
          ],
        },
      },
    ];
    const varNames = getVarNames(calledActions);
    const prompt = getDataAnalysisPrompt(
      command,
      calledActions,
      varNames,
      orgInfo,
    );
    expect(prompt[0]).toEqual({
      role: "system",
      content: `${getIntroText(
        orgInfo,
      )} Your task is to help the user by writing Javascript to format data received from orgName which can then be visualized to answer the user's question.

FACTS:
1. Today's date is ${new Date().toISOString().split("T")[0]}
2. Below are Typescript input and output types of the functions called:

\`\`\`
/** description1 **/
function action1(): {
accountId?: string // The account ID of a user.
globalPermissions?: string[] // Global permissions to look up.
projectPermissions?: { // Project permissions with associated projects and issues to look up.
issues?: integer[] // List of issue IDs.
permissions: string[] // List of project permissions.
projects?: integer[] // List of project IDs.
}[]
}
\`\`\`

RULES:
1. DO NOT call the functions above and DO NOT redefine them
2. DO NOT redefine the variables defined in code in the user's message. USE THESE as the raw data to transform into a graph for the user
3. If the user's request is impossible given the data in the variables, raise an error:
\`\`\`
raise new Error("To visualize this graph, I need you to provide me with ...");
\`\`\`
4. DO NOT import other libraries or frameworks and the following will cause runtime errors: fetch() (or any code that calls another server), eval(), new Function(), WebAssembly, console.log()
5. The user has code that visualizes the variable \`graphData\` which YOU MUST DEFINE as the following type:
\`\`\`
interface GraphData {
graphTitle: string
type: "line"|"bar"|"value"
data: {x:number|string;y:number}[] // If type is "value", then have a length 1 array and set y to the value
xLabel?: string
yLabel?: string // Include unit in brackets. Example: Conversion rate (%)
}
\`\`\`
6. Respond in the format below. THIS IS VERY IMPORTANT. DO NOT FORGET THIS. Both 'Thoughts' and 'Code' are required sections:

Thoughts: Think about whether the user's request is possible and if so, how to achieve it. Be very concise. This is only for your benefit - this is hidden from the user

Code:
\`\`\`
...
\`\`\``,
    });
  });
});
