import { describe, expect, it } from "@jest/globals";
import { OpenAPIV3_1 } from "openapi-types";
import {
  exampleRequestBody1,
  exampleRequestBody2,
  exampleRequestBody3,
  realWorldExampleSchema1,
  realWorldExampleSchema2,
} from "./testData";
import {
  formatBodySchemaToTS,
  getTSActionDescriptions,
} from "../../lib/prompts/tsConversion";
import { Action } from "../../lib/types";

describe("formatBodySchemaToTS", () => {
  it("real-world example 1", () => {
    const out = formatBodySchemaToTS(
      realWorldExampleSchema1.schema as OpenAPIV3_1.SchemaObject,
    );
    // We probably want to simplify the data.exchange object so it's less
    // nested and complex. It should probably be a top-level object instead,
    // but this requires changing how parameters are parsed from the GPT response.
    expect(out).toEqual(`data: {
exchange: { // exchange data model
serviceProviderConfiguration?: {
sellSideProvider?: string
buySideProvider?: string
sellSideVirtualization?: "enabled" | "disabled" | "not-applicable"
buySideVirtualization?: "enabled" | "disabled" | "not-applicable"
sellSideSourceOfTruth?: "if-core" | "baas-provider" | "card-processor"
buySideSourceOfTruth?: "if-core" | "baas-provider" | "card-processor"
}
type?: "spot" | "spot-debit-in-advance"
id?: string // ID of exchange
clientId: string // ID of client
quoteId: string // ID of quote
transactionNumber: string // Transaction number of exchange
fixedSide: "buy" | "sell" // which side is fixed as amount
rate: number // Rate
serviceProviderRate: number // Service provider rate
buyAccountId: string // ID of buy account
buyCurrency: string // ISO 4217 currency code
buyAmount: number // Buy amount of exchange
serviceProviderBuyAmount: number // Buy amount of service provider
sellAccountId: string // ID of sell account
sellCurrency: string // ISO 4217 currency code
sellAmount: number // Sell amount of exchange
serviceProviderSellAmount: number // Sell amount of service provider
feeAmount?: number // Fee amount
feeCurrency?: string // Fee currency
rollCount: integer // Roll count of exchange
originalExchangeDate: string // Original exchange date
exchangeDate: string // Calculated exchange date
cutOffDateTime: string // Exchange cut-off date time
settlementDate: string // Calculated exchange settlement date
status: "pending" | "on-hold" | "completed" | "cancelled" | "failed" // Status of Exchange
cancellationFee?: number // Cancellation fee
}
}`);
  });
  it("real-world example 2", () => {
    const out = formatBodySchemaToTS(
      realWorldExampleSchema2.schema as OpenAPIV3_1.SchemaObject,
    );
    expect(out).toEqual(`workflow: {
code: "client.issuing" | "client.sub-account" | "client.migration" // workflow code
}
data: {
account: {
clientId: string // id of client
currency: string // ISO 4217 currency code
alias?: string // alias of account, refer to Accounts section in Guides for details
}
sourceId?: string // id of the account to be migrated, required if workflow is migration
}
connect: {
serviceProvider?: string // account is connected to this service provider
}`);
  });
});

describe("getTSActionDescriptions", () => {
  it("no parameters", () => {
    const out = getTSActionDescriptions([
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
    expect(out).toEqual("function action1()\n");
  });
  it("no parameters multiple actions", () => {
    const out = getTSActionDescriptions([
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
    expect(out).toEqual(`function action1()\nfunction action2()\n`);
  });
  // Setting parameters
  it("1 parameter, required", () => {
    const out = getTSActionDescriptions([
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
      "\n/** description1 **/\nfunction action1(args: {\nparam1: string // a description\n})\n",
    );
  });
  it("1 parameter, not required", () => {
    const out = getTSActionDescriptions([
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
      "\n/** description1 **/\nfunction action1(args: {\nparam1?: string // a description\n})\n",
    );
  });
  it("1 parameter with string enums", () => {
    const out = getTSActionDescriptions([
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
      '\n/** description1 **/\nfunction action1(args: {\nparam1?: "alpha" | "beta" | "gamma" // a description\n})\n',
    );
  });
  it("1 parameter with number enums", () => {
    const out = getTSActionDescriptions([
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
      "\n/** description1 **/\nfunction action1(args: {\nparam1?: 1 | 2 | 3 // a description\n})\n",
    );
  });
  it("2 parameters 1 action", () => {
    const out = getTSActionDescriptions([
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
      `
/** description1 **/
function action1(args: {
param1?: string // a description
param2: number // this isn't a description
})
`,
    );
  });
  it("2 parameters 2 actions", () => {
    const out = getTSActionDescriptions([
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
      `
/** description1 **/
function action1(args: {
param1?: string // a description
param2: number // this isn't a description
})

/** description1 **/
function action2(args: {
param3?: string // a description
param4: number // this isn't a description
})
`,
    );
  });
  it("param with enum with 1 option", () => {
    const out = getTSActionDescriptions([
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
      `
/** description1 **/
function action1(args: {
param2?: number // this isn't a description
})
`,
    );
  });

  // Setting request_body_contents
  it("1 request body item", () => {
    const out = getTSActionDescriptions([
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
      `
/** description1 **/
function action1(args: {
param1: string // a description
})
`,
    );
  });
  it("2 request body items", () => {
    const out = getTSActionDescriptions([
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
      `
/** description1 **/
function action1(args: {
param1: string // a description
param2?: number // this is a number
})
`,
    );
  });
  it("request body simple array", () => {
    const out = getTSActionDescriptions([
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
    expect(out).toEqual(`
/** description #1 **/
function action1(args: {
updates: string[] // description of the array
})
`);
  });
  it("request body simple array, no array description", () => {
    const out = getTSActionDescriptions([
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
    expect(out).toEqual(`
/** description #1 **/
function action1(args: {
updates: string[] // array of item description
})
`);
  });
  it("exampleRequestBody1", () => {
    const out = getTSActionDescriptions([
      {
        name: "action1",
        description: "description1",
        parameters: [],
        request_body_contents: exampleRequestBody1,
      } as unknown as Action,
    ]);
    expect(out).toEqual(
      `
/** description1 **/
function action1(args: {
updates?: { // List of updates for a custom fields.
customField: string // The ID or key of the custom field. For example, \`customfield_10010\`.
issueIds: integer[] // The list of issue IDs.
value: any // The value for the custom field. The value must be compatible with the custom field type.
}[]
})
`,
    );
  });

  it("exampleRequestBody2", () => {
    const out = getTSActionDescriptions([
      {
        name: "action1",
        description: "description1",
        parameters: [],
        request_body_contents: exampleRequestBody2,
      } as unknown as Action,
    ]);
    expect(out).toEqual(
      `
/** description1 **/
function action1(args: {
accountId?: string // The account ID of a user.
globalPermissions?: string[] // Global permissions to look up.
projectPermissions?: { // Project permissions with associated projects and issues to look up.
issues?: integer[] // List of issue IDs.
permissions: string[] // List of project permissions.
projects?: integer[] // List of project IDs.
}[]
})
`,
    );
  });

  it("exampleRequestBody3", () => {
    const out = getTSActionDescriptions([
      {
        name: "action1",
        description: "description1",
        parameters: [],
        request_body_contents: exampleRequestBody3,
      } as unknown as Action,
    ]);
    expect(out).toEqual(
      `
/** description1 **/
function action1(args: {
description?: string // The description of the dashboard.
editPermissions: { // The edit permissions for the dashboard.
type: "user" | "group" | "project" | "projectRole" | "global" | "loggedin" | "authenticated" | "project-unknown" // user: Shared with a user. \`group\`: Shared with a group. \`project\` Shared with a project. \`projectRole\` Share with a project role in a project. \`global\` Shared globally. \`loggedin\` Shared with all logged-in users. \`project-unknown\` Shared with a project that the user does not have access to.
}[]
name: string // The name of the dashboard.
sharePermissions: { // The share permissions for the dashboard.
type: "user" | "group" | "project" | "projectRole" | "global" | "loggedin" | "authenticated" | "project-unknown" // user: Shared with a user. \`group\`: Shared with a group. \`project\` Shared with a project. \`projectRole\` Share with a project role in a project. \`global\` Shared globally. \`loggedin\` Shared with all logged-in users. \`project-unknown\` Shared with a project that the user does not have access to.
}[]
})
`,
    );
  });
  it("exampleRequestBody with enum with 1 option", () => {
    const out = getTSActionDescriptions([
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
                  description: "The description of the dashboard",
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
      `
/** description1 **/
function action1(args: {
description?: string // The description of the dashboard
})
`,
    );
  });
  it("exampleRequestBody with examples", () => {
    const out = getTSActionDescriptions([
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
      `
/** description1 **/
function action1(args: {
created?: string // When it was created. Example: 2021-01-01
enumProp: "option1" | "option2" // enum description
})
`,
    );
  });
  it("params with examples", () => {
    const out = getTSActionDescriptions([
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
      `
/** description1 **/
function action1(args: {
param1?: string // a description. Example: example1
updated?: integer // Example: 1663734553
})
`,
    );
  });
});
