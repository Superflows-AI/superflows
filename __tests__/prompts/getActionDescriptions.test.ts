import { describe, expect, it } from "@jest/globals";
import {
  formatReqBodySchema,
  getActionDescriptions,
} from "../../lib/prompts/chatBot";
import { Action } from "../../lib/types";
import {
  exampleRequestBody1,
  exampleRequestBody2,
  exampleRequestBody3,
} from "./testData";

describe("getActionDescriptions", () => {
  it("no parameters", () => {
    const out = getActionDescriptions([
      {
        name: "action1",
        active: true,
        parameters: [],
        request_body_contents: {},
        responses: [],
        action_type: "http",
        http_method: "GET",
      } as unknown as Action,
    ]);
    expect(out).toEqual("1. action1 PARAMETERS: None.\n");
  });
  // Setting parameters
  it("1 parameter, required", () => {
    const out = getActionDescriptions([
      {
        name: "action1",
        description: "description1",
        parameters: [
          {
            name: "param1",
            in: "query",
            description: "a description",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
      } as unknown as Action,
    ]);
    expect(out).toEqual(
      "1. action1: description1. PARAMETERS:\n- param1 (string): a description. REQUIRED\n"
    );
  });
  it("1 parameter, not required", () => {
    const out = getActionDescriptions([
      {
        name: "action1",
        description: "description1",
        parameters: [
          {
            name: "param1",
            in: "query",
            description: "a description",
            schema: {
              type: "string",
            },
          },
        ],
      } as unknown as Action,
    ]);
    expect(out).toEqual(
      "1. action1: description1. PARAMETERS:\n- param1 (string): a description.\n"
    );
  });
  it("1 parameter with string enums", () => {
    const out = getActionDescriptions([
      {
        name: "action1",
        description: "description1",
        parameters: [
          {
            name: "param1",
            in: "query",
            description: "a description",
            schema: {
              type: "string",
              enum: ["alpha", "beta", "gamma"],
            },
          },
        ],
      } as unknown as Action,
    ]);
    expect(out).toEqual(
      '1. action1: description1. PARAMETERS:\n- param1 ("alpha" | "beta" | "gamma"): a description.\n'
    );
  });
  it("1 parameter with number enums", () => {
    const out = getActionDescriptions([
      {
        name: "action1",
        description: "description1",
        parameters: [
          {
            name: "param1",
            in: "query",
            description: "a description",
            schema: {
              type: "number",
              enum: [1, 2, 3],
            },
          },
        ],
      } as unknown as Action,
    ]);
    expect(out).toEqual(
      "1. action1: description1. PARAMETERS:\n- param1 (1 | 2 | 3): a description.\n"
    );
  });
  it("2 parameters", () => {
    const out = getActionDescriptions([
      {
        name: "action1",
        description: "description1",
        parameters: [
          {
            name: "param1",
            in: "query",
            description: "a description",
            schema: {
              type: "string",
            },
          },
          {
            name: "param2",
            in: "path",
            description: "this isn't a description",
            required: true,
            schema: {
              type: "number",
            },
          },
        ],
      } as unknown as Action,
    ]);
    expect(out).toEqual(
      `1. action1: description1. PARAMETERS:
- param1 (string): a description.
- param2 (number): this isn't a description. REQUIRED
`
    );
  });
  it("param with enum with 1 option", () => {
    const out = getActionDescriptions([
      {
        name: "action1",
        description: "description1",
        parameters: [
          {
            name: "param1",
            in: "query",
            required: true,
            schema: {
              type: "string",
              enum: ["alpha"],
            },
          },
          {
            name: "param2",
            in: "path",
            description: "this isn't a description",
            schema: {
              type: "number",
            },
          },
        ],
        request_body_contents: {},
      } as unknown as Action,
    ]);
    expect(out).toEqual(
      `1. action1: description1. PARAMETERS:
- param2 (number): this isn't a description.
`
    );
  });

  // Setting request_body_contents
  it("1 request body item", () => {
    const out = getActionDescriptions([
      {
        name: "action1",
        description: "description1",
        parameters: [],
        request_body_contents: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                param1: {
                  type: "string",
                  description: "a description",
                },
              },
              required: ["param1"],
            },
          },
        },
      } as unknown as Action,
    ]);
    expect(out).toEqual(
      "1. action1: description1. PARAMETERS:\n- param1 (string): a description. REQUIRED\n"
    );
  });
  it("2 request body items", () => {
    const out = getActionDescriptions([
      {
        name: "action1",
        description: "description1",
        parameters: [],
        request_body_contents: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                param1: {
                  type: "string",
                  description: "a description",
                },
                param2: {
                  type: "number",
                  description: "this is a number",
                },
              },
              required: ["param1"],
            },
          },
        },
      } as unknown as Action,
    ]);
    expect(out).toEqual(
      `1. action1: description1. PARAMETERS:
- param1 (string): a description. REQUIRED
- param2 (number): this is a number.
`
    );
  });
  it("request body simple array", () => {
    const out = getActionDescriptions([
      {
        name: "action1",
        description: "description #1",
        parameters: [],
        request_body_contents: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                updates: {
                  description: "description of the array",
                  type: "array",
                  items: {
                    type: "string",
                    description: "item description",
                  },
                },
              },
              required: ["updates"],
            },
          },
        },
      } as unknown as Action,
    ]);
    expect(out).toEqual(`1. action1: description #1. PARAMETERS:
- updates (string[]): description of the array. REQUIRED
`);
  });
  it("request body simple array, no array description", () => {
    const out = getActionDescriptions([
      {
        name: "action1",
        description: "description #1",
        parameters: [],
        request_body_contents: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                updates: {
                  type: "array",
                  items: {
                    type: "string",
                    description: "item description",
                  },
                },
              },
              required: ["updates"],
            },
          },
        },
      } as unknown as Action,
    ]);
    expect(out).toEqual(`1. action1: description #1. PARAMETERS:
- updates (string[]): array of item description. REQUIRED
`);
  });
  it("exampleRequestBody1", () => {
    const out = getActionDescriptions([
      {
        name: "action1",
        description: "description1",
        parameters: [],
        request_body_contents: exampleRequestBody1,
      } as unknown as Action,
    ]);
    expect(out).toEqual(
      `1. action1: description1. PARAMETERS:
- updates (object[]): List of updates for a custom fields.
\t- customField (string): The ID or key of the custom field. For example, \`customfield_10010\`. REQUIRED
\t- issueIds (integer[]): The list of issue IDs. REQUIRED
\t- value (any): The value for the custom field. The value must be compatible with the custom field type. REQUIRED
`
    );
  });

  it("exampleRequestBody2", () => {
    const out = getActionDescriptions([
      {
        name: "action1",
        description: "description1",
        parameters: [],
        request_body_contents: exampleRequestBody2,
      } as unknown as Action,
    ]);
    expect(out).toEqual(
      `1. action1: description1. PARAMETERS:
- accountId (string): The account ID of a user.
- globalPermissions (string[]): Global permissions to look up.
- projectPermissions (object[]): Project permissions with associated projects and issues to look up.
\t- issues (integer[]): List of issue IDs.
\t- permissions (string[]): List of project permissions. REQUIRED
\t- projects (integer[]): List of project IDs.
`
    );
  });
  it("exampleRequestBody3", () => {
    const out = getActionDescriptions([
      {
        name: "action1",
        description: "description1",
        parameters: [],
        request_body_contents: exampleRequestBody3,
      } as unknown as Action,
    ]);
    expect(out).toEqual(
      `1. action1: description1. PARAMETERS:
- description (string): The description of the dashboard.
- editPermissions (object[]): The edit permissions for the dashboard. REQUIRED
\t- type ("user" | "group" | "project" | "projectRole" | "global" | "loggedin" | "authenticated" | "project-unknown"): user: Shared with a user. \`group\`: Shared with a group. \`project\` Shared with a project. \`projectRole\` Share with a project role in a project. \`global\` Shared globally. \`loggedin\` Shared with all logged-in users. \`project-unknown\` Shared with a project that the user does not have access to. REQUIRED
- name (string): The name of the dashboard. REQUIRED
- sharePermissions (object[]): The share permissions for the dashboard. REQUIRED
\t- type ("user" | "group" | "project" | "projectRole" | "global" | "loggedin" | "authenticated" | "project-unknown"): user: Shared with a user. \`group\`: Shared with a group. \`project\` Shared with a project. \`projectRole\` Share with a project role in a project. \`global\` Shared globally. \`loggedin\` Shared with all logged-in users. \`project-unknown\` Shared with a project that the user does not have access to. REQUIRED
`
    );
  });
  it("exampleRequestBody with enum with 1 option", () => {
    const out = getActionDescriptions([
      {
        name: "action1",
        description: "description1",
        parameters: [],
        request_body_contents: {
          "application/json": {
            schema: {
              required: ["enumProp"],
              type: "object",
              properties: {
                description: {
                  type: "string",
                  description: "The description of the dashboard.",
                },
                enumProp: {
                  type: "string",
                  enum: ["option1"],
                  description: "enum description",
                },
              },
              additionalProperties: false,
              description: "Details of a dashboard.",
            },
          },
        },
      } as unknown as Action,
    ]);
    expect(out).toEqual(
      `1. action1: description1. PARAMETERS:
- description (string): The description of the dashboard.
`
    );
  });
});
