import { describe, expect, it } from "@jest/globals";
import { OpenAPIV3_1 } from "openapi-types";
import {
  exampleRequestBody1,
  exampleRequestBody2,
  exampleRequestBody3,
  exampleRequestBodyArray1,
  exampleRequestBodyArray2,
  realWorldExampleAction1,
  realWorldExampleAction2,
  realWorldExampleAction3,
  realWorldExampleSchema1,
  realWorldExampleSchema2,
} from "./testData";
import {
  formatBodySchemaToTS,
  getActionTSSignature,
  getActionTSSignatures,
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
    expect(out).toEqual(`{
data: {
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
}
}`);
  });
  it("real-world example 2", () => {
    const out = formatBodySchemaToTS(
      realWorldExampleSchema2.schema as OpenAPIV3_1.SchemaObject,
    );
    expect(out).toEqual(`{
workflow: {
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
}
}`);
  });
  it("example array 1", () => {
    const out = formatBodySchemaToTS(
      exampleRequestBodyArray1["application/json"]
        .schema as OpenAPIV3_1.SchemaObject,
    );
    expect(out).toEqual(`{ // List of updates for a custom fields.
customField: string // The ID or key of the custom field. For example, \`customfield_10010\`.
issueIds: integer[] // The list of issue IDs.
value: any // The value for the custom field. The value must be compatible with the custom field type.
}[]`);
  });
  it("example array 2", () => {
    const out = formatBodySchemaToTS(
      exampleRequestBodyArray2["application/json"]
        .schema as OpenAPIV3_1.SchemaObject,
    );
    expect(out).toEqual(`string[] // List of updates for a custom fields.`);
  });
  it("real world action 1 subset", () => {
    const out = formatBodySchemaToTS(
      {
        required: [
          "accountHolderIdentityType",
          "clientId",
          "country",
          "currency",
          "id",
          "ledgerNumber",
          "mainAccountId",
          "routingCodes",
          "serviceProvider",
          "status",
        ],
        // @ts-ignore
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "id of account",
            format: "uuid",
            readOnly: true,
          },
          clientId: {
            type: "string",
            description: "id of client",
            format: "uuid",
          },
          status: {
            type: "string",
            description: "status of account",
            readOnly: true,
            enum: [Array],
          },
          country: {
            maxLength: 2,
            minLength: 2,
            type: "string",
            description: "ISO 3166-1 alpha-2 country code",
            readOnly: true,
          },
          currency: {
            maxLength: 3,
            minLength: 3,
            type: "string",
            description: "ISO 4217 currency code",
          },
          alias: {
            maxLength: 30,
            type: "string",
            description:
              "alias of account, refer to Accounts section in Guides for details",
          },
          routingCodes: {
            type: "object",
            description:
              "routing codes of account as map, refer to Accounts section in Guides for details",
            readOnly: true,
          },
          iban: {
            maxLength: 31,
            minLength: 15,
            pattern:
              "^[a-zA-Z]{2}[0-9]{2}[a-zA-Z0-9]{4}[0-9]{4}([a-zA-Z0-9]?){3,19}$|^[A-Z]{2}\\d{5}[0-9A-Z]{13}$",
            // @ts-ignore
            type: "string",
            description: "iban assigned to account",
            nullable: true,
            readOnly: true,
          },
          accountNumber: {
            maxLength: 20,
            minLength: 8,
            pattern: "^[0-9]{8,20}$",
            // @ts-ignore
            type: "string",
            description: "account number assigned to account",
            nullable: true,
            readOnly: true,
          },
          ledgerNumber: {
            maxLength: 8,
            minLength: 8,
            pattern: "^[0-9]{8,8}$",
            type: "string",
            description: "unique ledger number of account generated internally",
            readOnly: true,
          },
          availableBalance: {
            type: "number",
            description: "available balance of account",
            format: "double",
            readOnly: true,
          },
          receivableBalance: {
            type: "number",
            description: "receivable balance of account",
            format: "double",
            readOnly: true,
          },
          payableBalance: {
            type: "number",
            description: "payable balance of account",
            format: "double",
            readOnly: true,
          },
          accountHolderIdentityType: {
            type: "string",
            description: "type of account holder client's identity",
            readOnly: true,
            enum: [Array],
          },
          serviceProvider: {
            type: "string",
            description: "service provider which this account connected to",
            readOnly: true,
          },
          mainAccountId: {
            type: "string",
            description:
              "the main account id which the given account is linked to",
            format: "uuid",
            readOnly: true,
          },
        },
      },
      0,
      false,
      false,
      "response",
    );
    expect(out).toEqual(`{
id: string // id of account
clientId: string // id of client
country: string // ISO 3166-1 alpha-2 country code
currency: string // ISO 4217 currency code
alias?: string // alias of account, refer to Accounts section in Guides for details
iban?: string // iban assigned to account
accountNumber?: string // account number assigned to account
ledgerNumber: string // unique ledger number of account generated internally
availableBalance?: number // available balance of account
receivableBalance?: number // receivable balance of account
payableBalance?: number // payable balance of account
serviceProvider: string // service provider which this account connected to
mainAccountId: string // the main account id which the given account is linked to
}`);
  });
  it("real world action 1", () => {
    const out = formatBodySchemaToTS(
      // @ts-ignore
      realWorldExampleAction1.responses["200"].content["application/json"]
        .schema as OpenAPIV3_1.SchemaObject,
      0,
      false,
      false,
      "response",
    );
    expect(out).toEqual(`{
data: {
account?: {
clientId?: string[] // array of undefined
status?: (\"pending\" | \"active\" | \"inactive\" | \"suspended\" | \"closed\" | \"declined\")[] // array of status of account
currency?: string[] // array of undefined
alias?: string
routingCodeKey?: string
routingCodeValue?: string
iban?: string[] // array of undefined
accountNumber?: string[] // array of undefined
ledgerNumber?: string[] // array of undefined
availableBalanceFrom?: number
availableBalanceTo?: number
serviceProvider?: string[] // array of undefined
accountHolderName?: string
accountType?: (\"main-account\" | \"sub-account\" | \"standalone-account\")[] // array of undefined
mainAccountId?: string
}
accounts?: {
id: string // id of account
clientId: string // id of client
status: \"pending\" | \"active\" | \"inactive\" | \"suspended\" | \"closed\" | \"declined\" // status of account
country: string // ISO 3166-1 alpha-2 country code
currency: string // ISO 4217 currency code
alias?: string // alias of account, refer to Accounts section in Guides for details
iban?: string // iban assigned to account
accountNumber?: string // account number assigned to account
ledgerNumber: string // unique ledger number of account generated internally
availableBalance?: number // available balance of account
receivableBalance?: number // receivable balance of account
payableBalance?: number // payable balance of account
accountHolderIdentityType: \"corporate\" | \"individual\" // type of account holder client's identity
serviceProvider: string // service provider which this account connected to
mainAccountId: string // the main account id which the given account is linked to
}[]
}
metadata: {
page: {
size: integer // number of elements in this page
number: integer // index of page starting from 0
totalElements: integer // total number of elements in all of the pages
totalPages: integer // number of total pages
}
}
}`);
  });
});

describe("getTSActionDescriptions", () => {
  it("no parameters", () => {
    const out = getActionTSSignatures([
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
    const out = getActionTSSignatures([
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
    const out = getActionTSSignatures([
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
    const out = getActionTSSignatures([
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
    const out = getActionTSSignatures([
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
    const out = getActionTSSignatures([
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
    const out = getActionTSSignatures([
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
    const out = getActionTSSignatures([
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
    const out = getActionTSSignatures([
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
    const out = getActionTSSignatures([
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
    const out = getActionTSSignatures([
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
    const out = getActionTSSignatures([
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
    const out = getActionTSSignatures([
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
    const out = getActionTSSignatures([
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
    const out = getActionTSSignatures([
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
    const out = getActionTSSignatures([
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
    const out = getActionTSSignatures([
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
    const out = getActionTSSignatures([
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
    const out = getActionTSSignatures([
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

const actionObjectOutput1 = {
  name: "action1",
  description: "description1",
  parameters: [],
  request_body_contents: null,
  responses: {
    "200": {
      content: exampleRequestBody1,
    },
  },
} as unknown as Action;

describe("getActionTSSignature including output type", () => {
  it("Object output 1", () => {
    const out = getActionTSSignature(actionObjectOutput1, true);
    expect(out).toEqual(
      `
/** description1 **/
function action1(): {
updates?: { // List of updates for a custom fields.
value: any // The value for the custom field. The value must be compatible with the custom field type.
}[]
}
`,
    );
  });
  it("Object output 2", () => {
    const out = getActionTSSignature(
      {
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
      true,
    );
    expect(out).toEqual(
      `
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
`,
    );
  });
  it("Object output 3", () => {
    const out = getActionTSSignature(
      {
        name: "action1",
        description: "description1",
        parameters: [],
        request_body_contents: null,
        responses: {
          "200": {
            content: exampleRequestBody3,
          },
        },
      } as unknown as Action,
      true,
    );
    expect(out).toEqual(
      `
/** description1 **/
function action1(): {
description?: string // The description of the dashboard.
editPermissions: { // The edit permissions for the dashboard.
id?: integer // The unique identifier of the share permission.
type: "user" | "group" | "project" | "projectRole" | "global" | "loggedin" | "authenticated" | "project-unknown" // user: Shared with a user. \`group\`: Shared with a group. \`project\` Shared with a project. \`projectRole\` Share with a project role in a project. \`global\` Shared globally. \`loggedin\` Shared with all logged-in users. \`project-unknown\` Shared with a project that the user does not have access to.
}[]
name: string // The name of the dashboard.
sharePermissions: { // The share permissions for the dashboard.
id?: integer // The unique identifier of the share permission.
type: "user" | "group" | "project" | "projectRole" | "global" | "loggedin" | "authenticated" | "project-unknown" // user: Shared with a user. \`group\`: Shared with a group. \`project\` Shared with a project. \`projectRole\` Share with a project role in a project. \`global\` Shared globally. \`loggedin\` Shared with all logged-in users. \`project-unknown\` Shared with a project that the user does not have access to.
}[]
}
`,
    );
  });
  it("Array output 1", () => {
    const out = getActionTSSignature(
      {
        name: "action1",
        description: "description1",
        parameters: [],
        request_body_contents: null,
        responses: {
          "200": {
            content: exampleRequestBodyArray1,
          },
        },
      } as unknown as Action,
      true,
    );
    expect(out).toEqual(
      `
/** description1 **/
function action1(): { // List of updates for a custom fields.
value: any // The value for the custom field. The value must be compatible with the custom field type.
}[]
`,
    );
  });
  it("Array output 2", () => {
    const out = getActionTSSignature(
      {
        name: "action1",
        description: "description1",
        parameters: [],
        request_body_contents: null,
        responses: {
          "200": {
            content: exampleRequestBodyArray2,
          },
        },
      } as unknown as Action,
      true,
    );
    expect(out).toEqual(
      `
/** description1 **/
function action1(): string[] // List of updates for a custom fields.
`,
    );
  });
});
describe("getActionTSSignature with returned object", () => {
  it("Object output 1", () => {
    const out = getActionTSSignature(actionObjectOutput1, true, {
      updates: [
        { customField: "customField1", issueIds: [1, 2, 3], value: "value1" },
      ],
    });
    expect(out).toEqual(
      `
/** description1 **/
function action1(): {
updates?: { // List of updates for a custom fields.
value: any // The value for the custom field. The value must be compatible with the custom field type.
}[]
}
`,
    );
  });
  it("Object output 2 - object 1", () => {
    const out = getActionTSSignature(
      {
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
      true,
      { accountId: "1234", globalPermissions: ["perm1", "perm2"] },
    );
    expect(out).toEqual(
      `
/** description1 **/
function action1(): {
accountId?: string // The account ID of a user.
globalPermissions?: string[] // Global permissions to look up.
}
`,
    );
  });
  it("Object output 2 - object 2", () => {
    const out = getActionTSSignature(
      {
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
      true,
      {
        projectPermissions: {
          issues: [1, 2, 3],
          permissions: ["perm1", "perm2"],
          projects: [1, 2, 3],
        },
      },
    );
    expect(out).toEqual(
      `
/** description1 **/
function action1(): {
projectPermissions?: { // Project permissions with associated projects and issues to look up.
issues?: integer[] // List of issue IDs.
permissions: string[] // List of project permissions.
projects?: integer[] // List of project IDs.
}[]
}
`,
    );
  });
  it("Object output 2 - object 3", () => {
    const out = getActionTSSignature(
      {
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
      true,
      {
        projectPermissions: {
          issues: [1, 2, 3],
          permissions: ["perm1", "perm2"],
        },
      },
    );
    expect(out).toEqual(
      `
/** description1 **/
function action1(): {
projectPermissions?: { // Project permissions with associated projects and issues to look up.
issues?: integer[] // List of issue IDs.
permissions: string[] // List of project permissions.
}[]
}
`,
    );
  });
  it("Object output 3", () => {
    const out = getActionTSSignature(
      {
        name: "action1",
        description: "description1",
        parameters: [],
        request_body_contents: null,
        responses: {
          "200": {
            content: exampleRequestBody3,
          },
        },
      } as unknown as Action,
      true,
      {
        name: "name1",
        editPermissions: [{ type: "user" }, { type: "group" }],
      },
    );
    expect(out).toEqual(
      `
/** description1 **/
function action1(): {
editPermissions: { // The edit permissions for the dashboard.
type: "user" | "group" | "project" | "projectRole" | "global" | "loggedin" | "authenticated" | "project-unknown" // user: Shared with a user. \`group\`: Shared with a group. \`project\` Shared with a project. \`projectRole\` Share with a project role in a project. \`global\` Shared globally. \`loggedin\` Shared with all logged-in users. \`project-unknown\` Shared with a project that the user does not have access to.
}[]
name: string // The name of the dashboard.
}
`,
    );
  });
  it("Array output 1", () => {
    const out = getActionTSSignature(
      {
        name: "action1",
        description: "description1",
        parameters: [],
        request_body_contents: null,
        responses: {
          "200": {
            content: exampleRequestBodyArray1,
          },
        },
      } as unknown as Action,
      true,
      [
        {
          customField: "customField1",
          value: "value1",
        },
      ],
    );
    expect(out).toEqual(
      `
/** description1 **/
function action1(): { // List of updates for a custom fields.
value: any // The value for the custom field. The value must be compatible with the custom field type.
}[]
`,
    );
  });
  it("Real world example 1", () => {
    const out = getActionTSSignature(realWorldExampleAction1, true, {
      workflow: {},
      data: {
        accounts: [
          {
            id: "5907a188-e1be-496a-bf7c-6ae880ed3ea9",
            clientId: "09f42c3a-dcea-4468-a77a-40f1e6d456f1",
            status: "active",
            country: "GB",
            currency: "GBP",
            alias: "GBP Account",
            routingCodes: {},
            iban: null,
            accountNumber: null,
            ledgerNumber: "43606868",
            availableBalance: 150127,
            accountHolderIdentityType: "corporate",
            accountHolderName: "LFT Technology Ltd",
            mainAccountId: null,
            serviceProvider: "currencycloud",
          },
        ],
      },
      connect: {},
      metadata: {
        page: {
          size: 100,
          number: 0,
          totalElements: 70,
          totalPages: 1,
        },
      },
    });
    expect(out).toEqual(
      `
/** List Accounts **/
function listAccounts(args: {
metadata.page.number?: integer // 0-indexed page number
metadata.page.size?: integer // page size
metadata.sort?: string // default direction is ascending. Example: data.client.fullName,desc
data.account.clientId?: string
data.account.currency?: string
data.account.status?: "pending" | "active" | "inactive" | "suspended" | "closed" | "declined"
data.account.iban?: string
data.account.routingCodeKey?: string
data.account.routingCodeValue?: string
data.account.accountHolderName?: string
data.account.ledgerNumber?: string
data.account.serviceProvider?: string
data.account.availableBalanceFrom?: string // Use to search for accounts with more than this amount of available balance
data.account.availableBalanceTo?: string
}): {
data: {
accounts?: {
id: string // id of account
clientId: string // id of client
status: "pending" | "active" | "inactive" | "suspended" | "closed" | "declined" // status of account
country: string // ISO 3166-1 alpha-2 country code
currency: string // ISO 4217 currency code
alias?: string // alias of account, refer to Accounts section in Guides for details
iban?: string // iban assigned to account
accountNumber?: string // account number assigned to account
ledgerNumber: string // unique ledger number of account generated internally
availableBalance?: number // available balance of account
accountHolderIdentityType: "corporate" | "individual" // type of account holder client's identity
serviceProvider: string // service provider which this account connected to
mainAccountId: string // the main account id which the given account is linked to
}[]
}
metadata: {
page: {
size: integer // number of elements in this page
number: integer // index of page starting from 0
totalElements: integer // total number of elements in all of the pages
totalPages: integer // number of total pages
}
}
}
`,
    );
  });
  it("Real world example 2", () => {
    const out = getActionTSSignature(realWorldExampleAction2, true, {
      workflow: {},
      data: {
        outgoingTransfers: [
          {
            requirementConfiguration: {
              transferDateStatus: "not-fulfilled",
              complianceCheckStatus: "not-checked",
              balanceCheckStatus: "not-required",
              authorizationStatus: "not-required",
            },
            id: "c1e5bfea-1678-40d6-a28c-90e6665b1c35",
            transactionNumber: "20230817-W8557X",
            clientId: "09f42c3a-dcea-4468-a77a-40f1e6d456f1",
            transferDate: "2023-08-24",
            status: "failed",
            currency: "EUR",
            amount: 509,
            feeCurrency: "EUR",
            feeAmount: 11.69,
            description: null,
            transferReasonId: "5e0a7759-1c2f-4f96-ae31-29e824f47958",
            transferCustomReason: null,
            originalTransferDate: "2023-08-18",
            cutOffDateTime: "2023-08-24T13:00:00",
            rollCount: 1,
            scope: "external",
            totalAmount: 520.69,
            source: {
              type: "client-account",
              accountId: "68edfef0-c7b4-4316-8818-5e94a636454e",
            },
            destination: {
              type: "beneficiary-bank-account",
              beneficiaryBankAccountId: "40e61d56-137a-4e4f-8cee-c65e56508d32",
            },
            ownerType: "client",
            beneficiary: {
              fullName: "Euro test",
              identity: {
                type: "corporate",
                country: "NL",
                identifications: null,
                legalName: "Euro test",
                incorporationDate: null,
                corporationType: null,
              },
              address: {
                country: "NL",
                postalCode: "12345",
                city: "Amsterdam",
                street: "Amsterdam Street",
                houseNumber: "25",
              },
              account: {
                accountHolderName: null,
                country: "NL",
                currency: "EUR",
                routingCodes: {
                  bic: "ABNANL2A",
                },
                accountNumber: null,
                iban: "NL77ABNA5811534469",
                ledgerNumber: null,
                alias: "EUR account",
              },
              title: "Euro test",
            },
            scheme: "local",
          },
        ],
      },
      connect: {},
      metadata: {
        page: {
          size: 20,
          number: 0,
          totalElements: 9,
          totalPages: 1,
        },
      },
    });
    expect(out).toEqual(`
/** List Outgoing Transfers **/
function listOutgoingTransfers(args: {
data.outgoingTransfer.transactionNumber?: string // Find the data for a specific transaction number (e.g. 20230818-ASG36S6
data.outgoingTransfer.amountFrom?: string // Minimum amount
data.outgoingTransfer.status?: \"pending\" | \"processing\" | \"released\" | \"completed\" | \"cancelled\" | \"failed\" // transaction status
}): {
data: { // data container
outgoingTransfers?: {
requirementConfiguration?: { // Requirements configuration field to process the transfer
transferDateStatus?: \"not-checked\" | \"not-required\" | \"not-fulfilled\" | \"fulfilled\"
complianceCheckStatus?: \"not-checked\" | \"not-required\" | \"not-fulfilled\" | \"fulfilled\"
balanceCheckStatus?: \"not-checked\" | \"not-required\" | \"not-fulfilled\" | \"fulfilled\"
}
id?: string // id of outgoing transfer
transactionNumber?: string // unique transaction number
clientId?: string // id of client
transferDate?: string // date when transfer is executed, if account is not funded transfer will be rolled to next date and this field will be updated
status?: \"pending\" | \"on-hold\" | \"processing\" | \"released\" | \"completed\" | \"cancelled\" | \"failed\" // status of outgoing transfer
currency?: string // ISO 4217 currency code of outgoing transfer
amount?: number // transfer amount
feeCurrency?: string // ISO 4217 currency code of fee
feeAmount?: number // transfer fee amount
description?: string // free text to send along with transfer
transferReasonId?: string // id of transfer reason
transferCustomReason?: string // free text reason if transfer reason selected as other
originalTransferDate?: string // requested transfer date. this field won't be updated even if the transfer is rolled to next date
cutOffDateTime?: string // cutoff time in current transfer date
rollCount?: integer // how many times a transfer is rolled since account is unfunded until cutoff time
destination?: { // outgoing transfer destination container
type: string
}
ownerType?: "client" | "instance" // owner of the outgoing transfer
beneficiary?: { // beneficiary
fullName?: string
identity?: {
type: string
}
address?: {
country: string
city: string
street?: string
postalCode?: string
houseNumber?: string
}
account?: {
accountHolderName?: string
country?: string
currency?: string
routingCodes?: object
accountNumber?: string
iban?: string
ledgerNumber?: string
alias?: string
}
}
source?: {
type: string
}
scheme?: "swift" | "local" | "sepa" | "sepa-instant" | "chaps" | "bacs" | "faster-payments" | "ach" | "wire" // transfer scheme depending on the scope of the transfer
totalAmount?: number // total amount including fee, filled if charging method is on-source
scope?: "internal" | "external" // transfer scope
}[]
}
metadata: { // metadata container
page: {
size: integer // number of elements in this page
number: integer // index of page starting from 0
totalElements: integer // total number of elements in all of the pages
totalPages: integer // number of total pages
}
}
}
`);
  });
  it("Real world example 3", () => {
    const out = getActionTSSignature(realWorldExampleAction3, true, [
      {
        id: 1561318381790,
        timeline: [
          { period: "2022-05", demand: 0, picks: 0, forecast: 26.6567 },
          { period: "2022-06", demand: 192, picks: 3, forecast: 20.094 },
          { period: "2022-07", demand: 176, picks: 1, forecast: 129 },
        ],
      },
      {
        id: 1561318384997,
        timeline: [
          { period: "2022-05", demand: 0, picks: 0, forecast: 0.8333 },
          { period: "2022-06", demand: 0, picks: 0, forecast: 0.7143 },
          { period: "2022-07", demand: 0, picks: 0, forecast: 0.625 },
        ],
      },
    ]);
    expect(out).toEqual(`
/** List demand **/
function filterDemand(): {
id: integer // Item id
timeline: {
demand: integer // The number of items sold (not their value)
forecast: number // The forecast demand for a future period, or previously-forecast demand for a past period
period: string // The period the figures are reported for
picks: integer // The number of times a customer buys any number of this item type (1 pick often corresponds to many items sold)
}[]
}[]
`);
  });
});
