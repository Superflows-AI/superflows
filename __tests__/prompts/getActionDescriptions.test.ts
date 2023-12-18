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
  realWorldExampleSchema1,
  realWorldExampleSchema2,
} from "./testData";
import { OpenAPIV3_1 } from "openapi-types";

describe("formatReqBodySchema", () => {
  it("real-world example 1", () => {
    const out = formatReqBodySchema(
      realWorldExampleSchema1.schema as OpenAPIV3_1.SchemaObject,
    );
    // We probably want to simplify the data.exchange object so it's less
    // nested and complex. It should probably be a top-level object instead,
    // but this requires changing how parameters are parsed from the GPT response.
    expect(out).toEqual(`
- data (object) REQUIRED
\t- exchange (object): exchange data model. REQUIRED
\t\t- serviceProviderConfiguration (object)
\t\t\t- sellSideProvider (string)
\t\t\t- buySideProvider (string)
\t\t\t- sellSideVirtualization ("enabled" | "disabled" | "not-applicable")
\t\t\t- buySideVirtualization ("enabled" | "disabled" | "not-applicable")
\t\t\t- sellSideSourceOfTruth ("if-core" | "baas-provider" | "card-processor")
\t\t\t- buySideSourceOfTruth ("if-core" | "baas-provider" | "card-processor")
\t\t- type ("spot" | "spot-debit-in-advance")
\t\t- id (string): ID of exchange.
\t\t- clientId (string): ID of client. REQUIRED
\t\t- quoteId (string): ID of quote. REQUIRED
\t\t- transactionNumber (string): Transaction number of exchange. REQUIRED
\t\t- fixedSide ("buy" | "sell"): which side is fixed as amount. REQUIRED
\t\t- rate (number): Rate. REQUIRED
\t\t- serviceProviderRate (number): Service provider rate. REQUIRED
\t\t- buyAccountId (string): ID of buy account. REQUIRED
\t\t- buyCurrency (string): ISO 4217 currency code. REQUIRED
\t\t- buyAmount (number): Buy amount of exchange. REQUIRED
\t\t- serviceProviderBuyAmount (number): Buy amount of service provider. REQUIRED
\t\t- sellAccountId (string): ID of sell account. REQUIRED
\t\t- sellCurrency (string): ISO 4217 currency code. REQUIRED
\t\t- sellAmount (number): Sell amount of exchange. REQUIRED
\t\t- serviceProviderSellAmount (number): Sell amount of service provider. REQUIRED
\t\t- feeAmount (number): Fee amount.
\t\t- feeCurrency (string): Fee currency.
\t\t- rollCount (integer): Roll count of exchange. REQUIRED
\t\t- originalExchangeDate (string): Original exchange date. REQUIRED
\t\t- exchangeDate (string): Calculated exchange date. REQUIRED
\t\t- cutOffDateTime (string): Exchange cut-off date time. REQUIRED
\t\t- settlementDate (string): Calculated exchange settlement date. REQUIRED
\t\t- status ("pending" | "on-hold" | "completed" | "cancelled" | "failed"): Status of Exchange. REQUIRED
\t\t- cancellationFee (number): Cancellation fee.`);
  });
  it("real-world example 2", () => {
    const out = formatReqBodySchema(
      realWorldExampleSchema2.schema as OpenAPIV3_1.SchemaObject,
    );
    expect(out).toEqual(`
- workflow (object) REQUIRED
\t- code ("client.issuing" | "client.sub-account" | "client.migration"): workflow code. REQUIRED
- data (object) REQUIRED
\t- account (object) REQUIRED
\t\t- clientId (string): id of client. REQUIRED
\t\t- currency (string): ISO 4217 currency code. REQUIRED
\t\t- alias (string): alias of account, refer to Accounts section in Guides for details.
\t- sourceId (string): id of the account to be migrated, required if workflow is migration.
- connect (object) REQUIRED
\t- serviceProvider (string): account is connected to this service provider.`);
  });
});

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
    expect(out).toEqual("action1 PARAMETERS: None.\n");
  });
  it("no parameters multiple actions", () => {
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
      {
        name: "action2",
        active: true,
        parameters: [],
        request_body_contents: {},
        responses: [],
        action_type: "http",
        http_method: "GET",
      } as unknown as Action,
    ]);
    expect(out).toEqual(
      `1. action1 PARAMETERS: None.\n2. action2 PARAMETERS: None.\n`,
    );
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
      "action1: description1. PARAMETERS:\n- param1 (string): a description. REQUIRED\n",
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
      "action1: description1. PARAMETERS:\n- param1 (string): a description.\n",
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
      'action1: description1. PARAMETERS:\n- param1 ("alpha" | "beta" | "gamma"): a description.\n',
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
      "action1: description1. PARAMETERS:\n- param1 (1 | 2 | 3): a description.\n",
    );
  });
  it("2 parameters 1 action", () => {
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
      `action1: description1. PARAMETERS:
- param1 (string): a description.
- param2 (number): this isn't a description. REQUIRED
`,
    );
  });
  it("2 parameters 2 actions", () => {
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

      {
        name: "action2",
        description: "description1",
        parameters: [
          {
            name: "param3",
            in: "query",
            description: "a description",
            schema: {
              type: "string",
            },
          },
          {
            name: "param4",
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
2. action2: description1. PARAMETERS:
- param3 (string): a description.
- param4 (number): this isn't a description. REQUIRED
`,
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
      `action1: description1. PARAMETERS:
- param2 (number): this isn't a description.
`,
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
      "action1: description1. PARAMETERS:\n- param1 (string): a description. REQUIRED\n",
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
      `action1: description1. PARAMETERS:
- param1 (string): a description. REQUIRED
- param2 (number): this is a number.
`,
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
    expect(out).toEqual(`action1: description #1. PARAMETERS:
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
    expect(out).toEqual(`action1: description #1. PARAMETERS:
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
      `action1: description1. PARAMETERS:
- updates (object[]): List of updates for a custom fields.
\t- customField (string): The ID or key of the custom field. For example, \`customfield_10010\`. REQUIRED
\t- issueIds (integer[]): The list of issue IDs. REQUIRED
\t- value (any): The value for the custom field. The value must be compatible with the custom field type. REQUIRED
`,
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
      `action1: description1. PARAMETERS:
- accountId (string): The account ID of a user.
- globalPermissions (string[]): Global permissions to look up.
- projectPermissions (object[]): Project permissions with associated projects and issues to look up.
\t- issues (integer[]): List of issue IDs.
\t- permissions (string[]): List of project permissions. REQUIRED
\t- projects (integer[]): List of project IDs.
`,
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
      `action1: description1. PARAMETERS:
- description (string): The description of the dashboard.
- editPermissions (object[]): The edit permissions for the dashboard. REQUIRED
\t- type ("user" | "group" | "project" | "projectRole" | "global" | "loggedin" | "authenticated" | "project-unknown"): user: Shared with a user. \`group\`: Shared with a group. \`project\` Shared with a project. \`projectRole\` Share with a project role in a project. \`global\` Shared globally. \`loggedin\` Shared with all logged-in users. \`project-unknown\` Shared with a project that the user does not have access to. REQUIRED
- name (string): The name of the dashboard. REQUIRED
- sharePermissions (object[]): The share permissions for the dashboard. REQUIRED
\t- type ("user" | "group" | "project" | "projectRole" | "global" | "loggedin" | "authenticated" | "project-unknown"): user: Shared with a user. \`group\`: Shared with a group. \`project\` Shared with a project. \`projectRole\` Share with a project role in a project. \`global\` Shared globally. \`loggedin\` Shared with all logged-in users. \`project-unknown\` Shared with a project that the user does not have access to. REQUIRED
`,
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
      `action1: description1. PARAMETERS:
- description (string): The description of the dashboard.
`,
    );
  });
  it("exampleRequestBody with examples", () => {
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
                created: {
                  type: "string",
                  description: "When it was created",
                  example: "2021-01-01",
                },
                enumProp: {
                  type: "string",
                  enum: ["option1", "option2"],
                  description: "enum description",
                  example: "option2",
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
      `action1: description1. PARAMETERS:
- created (string): When it was created. Example: 2021-01-01.
- enumProp ("option1" | "option2"): enum description. REQUIRED
`,
    );
  });
  it("params with examples", () => {
    const out = getActionDescriptions([
      {
        name: "action1",
        description: "description1",
        parameters: [
          {
            name: "param1",
            in: "query",
            required: false,
            description: "a description",
            schema: {
              type: "string",
              example: "example1",
            },
          },
          {
            name: "updated",
            in: "query",
            required: false,
            schema: {
              type: "integer",
            },
            example: 1663734553,
          },
        ],
        request_body_contents: null,
      } as unknown as Action,
    ]);
    expect(out).toEqual(
      `action1: description1. PARAMETERS:
- param1 (string): a description. Example: example1.
- updated (integer) Example: 1663734553.
`,
    );
  });
  it("array parameter", () => {
    const out = getActionDescriptions([
      {
        name: "action1",
        description: "description1",
        parameters: [
          {
            in: "query",
            name: "filters",
            schema: {
              type: "array",
              items: {
                type: "object",
                required: ["path", "operator", "value"],
                properties: {
                  path: {
                    enum: ["listing_active", "country"],
                    type: "string",
                  },
                  operator: {
                    description: "An enumeration",
                    enum: ["=="],
                    type: "string",
                  },
                  value: {
                    type: "string",
                  },
                },
              },
            },
          },
        ],
        request_body_contents: null,
      } as unknown as Action,
    ]);
    expect(out).toEqual(
      `action1: description1. PARAMETERS:
- filters (object[])
\t- path ("listing_active" | "country") REQUIRED
\t- value (string) REQUIRED
`,
    );
  });
});
