import { Action } from "../../lib/types";

export const exampleRequestBody1 = {
  "application/json": {
    schema: {
      type: "object",
      properties: {
        updates: {
          type: "array",
          items: {
            required: ["customField", "issueIds", "value"],
            type: "object",
            properties: {
              customField: {
                type: "string",
                description:
                  "The ID or key of the custom field. For example, `customfield_10010`.",
                writeOnly: true,
              },
              issueIds: {
                type: "array",
                description: "The list of issue IDs.",
                writeOnly: true,
                items: {
                  type: "integer",
                  format: "int64",
                  writeOnly: true,
                },
              },
              value: {
                description:
                  "The value for the custom field. The value must be compatible with the [custom field type](https://developer.atlassian.com/platform/forge/manifest-reference/modules/jira-custom-field/#data-types).",
              },
            },
            additionalProperties: false,
            description:
              "A custom field and its new value with a list of issue to update.",
            writeOnly: true,
          },
          description: "List of updates for a custom fields.",
        },
      },
      additionalProperties: false,
      writeOnly: true,
    },
    example: {
      updates: [
        {
          customField: "customfield_10010",
          issueIds: [10010, 10011],
          value: "new value",
        },
        {
          customField: "customfield_10011",
          issueIds: [10010],
          value: 1000,
        },
      ],
    },
  },
};

export const exampleRequestBody2 = {
  "application/json": {
    schema: {
      type: "object",
      properties: {
        accountId: {
          type: "string",
          description: "The account ID of a user.",
        },
        globalPermissions: {
          uniqueItems: true,
          type: "array",
          description: "Global permissions to look up.",
          items: {
            type: "string",
          },
        },
        projectPermissions: {
          uniqueItems: true,
          type: "array",
          description:
            "Project permissions with associated projects and issues to look up.",
          items: {
            required: ["permissions"],
            type: "object",
            properties: {
              issues: {
                uniqueItems: true,
                type: "array",
                description: "List of issue IDs.",
                items: {
                  type: "integer",
                  format: "int64",
                },
              },
              permissions: {
                uniqueItems: true,
                type: "array",
                description: "List of project permissions.",
                items: {
                  type: "string",
                },
              },
              projects: {
                uniqueItems: true,
                type: "array",
                description: "List of project IDs.",
                items: {
                  type: "integer",
                  format: "int64",
                },
              },
            },
            additionalProperties: false,
            description:
              "Details of project permissions and associated issues and projects to look up.",
          },
        },
      },
      additionalProperties: false,
      description:
        "Details of global permissions to look up and project permissions with associated projects and issues to look up.",
    },
    example: {
      accountId: "5b10a2844c20165700ede21g",
      globalPermissions: ["ADMINISTER"],
      projectPermissions: [
        {
          issues: [10010, 10011, 10012, 10013, 10014],
          permissions: ["EDIT_ISSUES"],
          projects: [10001],
        },
      ],
    },
  },
};

export const exampleRequestBody3 = {
  "application/json": {
    schema: {
      required: ["editPermissions", "name", "sharePermissions"],
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "The description of the dashboard.",
        },
        editPermissions: {
          type: "array",
          description: "The edit permissions for the dashboard.",
          items: {
            required: ["type"],
            type: "object",
            properties: {
              id: {
                type: "integer",
                description: "The unique identifier of the share permission.",
                format: "int64",
                readOnly: true,
              },
              type: {
                type: "string",
                description:
                  "user: Shared with a user. `group`: Shared with a group. `project` Shared with a project. `projectRole` Share with a project role in a project. `global` Shared globally. `loggedin` Shared with all logged-in users. `project-unknown` Shared with a project that the user does not have access to.",
                enum: [
                  "user",
                  "group",
                  "project",
                  "projectRole",
                  "global",
                  "loggedin",
                  "authenticated",
                  "project-unknown",
                ],
              },
            },
            additionalProperties: false,
            description: "Details of a share permission for the filter.",
          },
        },
        name: {
          type: "string",
          description: "The name of the dashboard.",
        },
        sharePermissions: {
          type: "array",
          description: "The share permissions for the dashboard.",
          items: {
            required: ["type"],
            type: "object",
            properties: {
              id: {
                type: "integer",
                description: "The unique identifier of the share permission.",
                format: "int64",
                readOnly: true,
              },
              type: {
                type: "string",
                description:
                  "user: Shared with a user. `group`: Shared with a group. `project` Shared with a project. `projectRole` Share with a project role in a project. `global` Shared globally. `loggedin` Shared with all logged-in users. `project-unknown` Shared with a project that the user does not have access to.",
                enum: [
                  "user",
                  "group",
                  "project",
                  "projectRole",
                  "global",
                  "loggedin",
                  "authenticated",
                  "project-unknown",
                ],
              },
            },
            additionalProperties: false,
            description: "Details of a share permission for the filter.",
          },
        },
      },
      additionalProperties: false,
      description: "Details of a dashboard.",
    },
  },
};

export const exampleRequestBodyArray1 = {
  "application/json": {
    schema: {
      type: "array",
      items: {
        required: ["customField", "issueIds", "value"],
        type: "object",
        properties: {
          customField: {
            type: "string",
            description:
              "The ID or key of the custom field. For example, `customfield_10010`.",
            writeOnly: true,
          },
          issueIds: {
            type: "array",
            description: "The list of issue IDs.",
            writeOnly: true,
            items: {
              type: "integer",
              format: "int64",
              writeOnly: true,
            },
          },
          value: {
            description:
              "The value for the custom field. The value must be compatible with the [custom field type](https://developer.atlassian.com/platform/forge/manifest-reference/modules/jira-custom-field/#data-types).",
          },
        },
        additionalProperties: false,
        description:
          "A custom field and its new value with a list of issue to update.",
        writeOnly: true,
      },
      description: "List of updates for a custom fields.",
    },
    example: [
      {
        customField: "customfield_10010",
        issueIds: [10010, 10011],
        value: "new value",
      },
      {
        customField: "customfield_10011",
        issueIds: [10010],
        value: 1000,
      },
    ],
  },
};
export const exampleRequestBodyArray2 = {
  "application/json": {
    schema: {
      type: "array",
      items: {
        type: "string",
        description:
          "A custom field and its new value with a list of issue to update.",
      },
      description: "List of updates for a custom fields.",
    },
  },
};

export const realWorldExampleSchema1 = {
  schema: {
    required: ["connect", "data", "metadata", "workflow"],
    type: "object",
    properties: {
      workflow: {
        required: ["code"],
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "workflow code",
            enum: ["client.direct.spot"],
          },
        },
      },
      data: {
        required: ["exchange"],
        type: "object",
        properties: {
          exchange: {
            required: [
              "buyAccountId",
              "buyAmount",
              "buyCurrency",
              "clientId",
              "cutOffDateTime",
              "exchangeDate",
              "fixedSide",
              "originalExchangeDate",
              "quoteId",
              "rate",
              "rollCount",
              "sellAccountId",
              "sellAmount",
              "sellCurrency",
              "serviceProviderBuyAmount",
              "serviceProviderRate",
              "serviceProviderSellAmount",
              "settlementDate",
              "status",
              "transactionNumber",
            ],
            type: "object",
            properties: {
              serviceProviderConfiguration: {
                type: "object",
                properties: {
                  sellSideProvider: {
                    type: "string",
                    enum: [
                      "CLT",
                      "DHB",
                      "RLB",
                      "FXR",
                      "KCL",
                      "CAB",
                      "CLB",
                      "TCC",
                      "CCE",
                      "NIU",
                      "LHV",
                      "GPS",
                      "COA",
                      "SUM",
                      "UNC",
                      "MOD",
                    ],
                  },
                  buySideProvider: {
                    type: "string",
                    enum: [
                      "CLT",
                      "DHB",
                      "RLB",
                      "FXR",
                      "KCL",
                      "CAB",
                      "CLB",
                      "TCC",
                      "CCE",
                      "NIU",
                      "LHV",
                      "GPS",
                      "COA",
                      "SUM",
                      "UNC",
                      "MOD",
                    ],
                  },
                  sellSideVirtualization: {
                    type: "string",
                    enum: ["enabled", "disabled", "not-applicable"],
                  },
                  buySideVirtualization: {
                    type: "string",
                    enum: ["enabled", "disabled", "not-applicable"],
                  },
                  sellSideSourceOfTruth: {
                    type: "string",
                    enum: ["if-core", "baas-provider", "card-processor"],
                  },
                  buySideSourceOfTruth: {
                    type: "string",
                    enum: ["if-core", "baas-provider", "card-processor"],
                  },
                },
              },
              type: { type: "string", enum: ["spot", "spot-debit-in-advance"] },
              id: {
                type: "string",
                description: "ID of exchange",
                format: "uuid",
              },
              clientId: {
                type: "string",
                description: "ID of client",
                format: "uuid",
              },
              quoteId: {
                type: "string",
                description: "ID of quote",
                format: "uuid",
              },
              transactionNumber: {
                type: "string",
                description: "Transaction number of exchange",
              },
              fixedSide: {
                type: "string",
                description: "which side is fixed as amount",
                enum: ["buy", "sell"],
              },
              rate: { type: "number", description: "Rate" },
              serviceProviderRate: {
                type: "number",
                description: "Service provider rate",
              },
              buyAccountId: {
                type: "string",
                description: "ID of buy account",
                format: "uuid",
              },
              buyCurrency: {
                maxLength: 3,
                minLength: 3,
                type: "string",
                description: "ISO 4217 currency code",
              },
              buyAmount: {
                type: "number",
                description: "Buy amount of exchange",
              },
              serviceProviderBuyAmount: {
                type: "number",
                description: "Buy amount of service provider",
              },
              sellAccountId: {
                type: "string",
                description: "ID of sell account",
                format: "uuid",
              },
              sellCurrency: {
                maxLength: 3,
                minLength: 3,
                type: "string",
                description: "ISO 4217 currency code",
              },
              sellAmount: {
                type: "number",
                description: "Sell amount of exchange",
              },
              serviceProviderSellAmount: {
                type: "number",
                description: "Sell amount of service provider",
              },
              feeAmount: { type: "number", description: "Fee amount" },
              feeCurrency: { type: "string", description: "Fee currency" },
              rollCount: {
                type: "integer",
                description: "Roll count of exchange",
                format: "int32",
              },
              originalExchangeDate: {
                type: "string",
                description: "Original exchange date",
                format: "date",
              },
              exchangeDate: {
                type: "string",
                description: "Calculated exchange date",
                format: "date",
              },
              cutOffDateTime: {
                type: "string",
                description: "Exchange cut-off date time",
                format: "date-time",
              },
              settlementDate: {
                type: "string",
                description: "Calculated exchange settlement date",
                format: "date",
              },
              status: {
                type: "string",
                description: "Status of Exchange",
                enum: [
                  "pending",
                  "on-hold",
                  "completed",
                  "cancelled",
                  "failed",
                ],
              },
              cancellationFee: {
                type: "number",
                description: "Cancellation fee",
                nullable: true,
              },
            },
            description: "exchange data model",
            readOnly: false,
          },
        },
      },
      connect: {
        required: ["serviceProvider", "type"],
        type: "object",
        properties: {
          type: {
            type: "string",
            description: "service provider selection type",
            enum: ["explicit"],
          },
          serviceProvider: {
            type: "string",
            description: "account is connected to this service provider ",
            enum: ["railsbank"],
          },
        },
      },
      metadata: { type: "object" },
    },
  },
};

export const realWorldExampleSchema2 = {
  schema: {
    required: ["connect", "data", "metadata", "workflow"],
    type: "object",
    properties: {
      workflow: {
        required: ["code"],
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "workflow code",
            enum: ["client.issuing", "client.sub-account", "client.migration"],
          },
        },
      },
      data: {
        required: ["account"],
        type: "object",
        properties: {
          account: {
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
                enum: [
                  "pending",
                  "active",
                  "inactive",
                  "suspended",
                  "closed",
                  "declined",
                ],
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
                type: "string",
                description: "iban assigned to account",
                nullable: true,
                readOnly: true,
              },
              accountNumber: {
                maxLength: 20,
                minLength: 8,
                pattern: "^[0-9]{8,20}$",
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
                description:
                  "unique ledger number of account generated internally",
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
                enum: ["corporate", "individual"],
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
          sourceId: {
            type: "string",
            description:
              "id of the account to be migrated, required if workflow is migration",
            writeOnly: true,
          },
        },
      },
      connect: {
        required: ["type"],
        type: "object",
        properties: {
          type: {
            type: "string",
            description: "service provider selection type",
            enum: ["explicit"],
          },
          serviceProvider: {
            type: "string",
            description: "account is connected to this service provider",
          },
        },
      },
      metadata: {
        type: "object",
      },
    },
  },
  examples: {
    "client-issuing": {
      description: "client-issuing",
    },
    "client-migration": {
      description: "client-migration",
    },
  },
};

export const realWorldExampleAction1 = {
  id: 6157,
  name: "list_accounts",
  description: "List Accounts",
  active: true,
  org_id: 192,
  tag: 3985,
  action_type: "http",
  path: "/accounts",
  request_body_contents: null,
  parameters: [
    {
      name: "metadata.page.number",
      in: "query",
      description: "0-indexed page number",
      schema: {
        minimum: 0,
        type: "integer",
        format: "int32",
        default: 0,
      },
    },
    {
      name: "metadata.page.size",
      in: "query",
      description: "page size",
      schema: {
        minimum: 1,
        type: "integer",
        format: "int32",
        default: 10,
      },
    },
    {
      name: "metadata.sort",
      in: "query",
      description: "default direction is ascending",
      schema: {
        type: "string",
      },
      example: "data.client.fullName,desc",
    },
    {
      name: "data.account.clientId",
      in: "query",
      schema: {
        type: "string",
      },
    },
    {
      name: "data.account.currency",
      in: "query",
      schema: {
        type: "string",
      },
    },
    {
      name: "data.account.status",
      in: "query",
      schema: {
        type: "string",
        enum: [
          "pending",
          "active",
          "inactive",
          "suspended",
          "closed",
          "declined",
        ],
      },
    },
    {
      name: "data.account.iban",
      in: "query",
      schema: {
        type: "string",
      },
    },
    {
      name: "data.account.routingCodeKey",
      in: "query",
      schema: {
        type: "string",
        enum: [
          "bic",
          "sort-code",
          "aba",
          "rtn-canada",
          "clabe",
          "bsb-code",
          "ifsc",
          "cnaps",
          "bank-code",
          "branch-code",
        ],
      },
    },
    {
      name: "data.account.routingCodeValue",
      in: "query",
      schema: {
        type: "string",
      },
    },
    {
      name: "data.account.accountHolderName",
      in: "query",
      schema: {
        type: "string",
      },
    },
    {
      name: "data.account.ledgerNumber",
      in: "query",
      schema: {
        type: "string",
      },
    },
    {
      name: "data.account.serviceProvider",
      in: "query",
      schema: {
        type: "string",
      },
    },
    {
      name: "data.account.availableBalanceFrom",
      in: "query",
      description:
        "Use to search for accounts with more than this amount of available balance",
      schema: {
        type: "string",
      },
    },
    {
      name: "data.account.availableBalanceTo",
      in: "query",
      schema: {
        type: "string",
      },
    },
  ],
  responses: {
    "200": {
      description: "Account list returned",
      content: {
        "application/json": {
          schema: {
            required: ["connect", "data", "metadata", "workflow"],
            type: "object",
            properties: {
              workflow: {
                type: "object",
              },
              data: {
                type: "object",
                properties: {
                  account: {
                    type: "object",
                    properties: {
                      clientId: {
                        type: "array",
                        items: {
                          type: "string",
                          format: "uuid",
                        },
                      },
                      status: {
                        type: "array",
                        items: {
                          type: "string",
                          description: "status of account",
                          readOnly: true,
                          enum: [
                            "pending",
                            "active",
                            "inactive",
                            "suspended",
                            "closed",
                            "declined",
                          ],
                        },
                      },
                      currency: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },
                      alias: {
                        type: "string",
                      },
                      routingCodeKey: {
                        type: "string",
                        enum: [
                          "bic",
                          "sort-code",
                          "aba",
                          "rtn-canada",
                          "clabe",
                          "bsb-code",
                          "ifsc",
                          "cnaps",
                          "bank-code",
                          "branch-code",
                        ],
                      },
                      routingCodeValue: {
                        type: "string",
                      },
                      iban: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },
                      accountNumber: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },
                      ledgerNumber: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },
                      availableBalanceFrom: {
                        type: "number",
                      },
                      availableBalanceTo: {
                        type: "number",
                      },
                      serviceProvider: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },
                      accountHolderName: {
                        type: "string",
                      },
                      accountType: {
                        type: "array",
                        items: {
                          type: "string",
                          enum: [
                            "main-account",
                            "sub-account",
                            "standalone-account",
                          ],
                        },
                      },
                      mainAccountId: {
                        type: "string",
                      },
                    },
                  },
                  accounts: {
                    type: "array",
                    items: {
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
                          enum: [
                            "pending",
                            "active",
                            "inactive",
                            "suspended",
                            "closed",
                            "declined",
                          ],
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
                          type: "string",
                          description: "iban assigned to account",
                          nullable: true,
                          readOnly: true,
                        },
                        accountNumber: {
                          maxLength: 20,
                          minLength: 8,
                          pattern: "^[0-9]{8,20}$",
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
                          description:
                            "unique ledger number of account generated internally",
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
                          description:
                            "type of account holder client's identity",
                          readOnly: true,
                          enum: ["corporate", "individual"],
                        },
                        serviceProvider: {
                          type: "string",
                          description:
                            "service provider which this account connected to",
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
                  },
                },
              },
              connect: {
                type: "object",
              },
              metadata: {
                required: ["page"],
                type: "object",
                properties: {
                  page: {
                    required: ["number", "size", "totalElements", "totalPages"],
                    type: "object",
                    properties: {
                      size: {
                        minimum: 0,
                        type: "integer",
                        description: "number of elements in this page",
                        format: "int32",
                      },
                      number: {
                        minimum: 0,
                        type: "integer",
                        description: "index of page starting from 0",
                        format: "int32",
                      },
                      totalElements: {
                        minimum: 0,
                        type: "integer",
                        description:
                          "total number of elements in all of the pages",
                        format: "int64",
                        readOnly: true,
                      },
                      totalPages: {
                        minimum: 0,
                        type: "integer",
                        description: "number of total pages",
                        format: "int32",
                        readOnly: true,
                      },
                    },
                  },
                },
              },
            },
          },
          example: {
            workflow: "{}",
            data: {
              accounts: [
                {
                  id: "045f4568-3a75-4bcf-97f3-54cfeeb45137",
                  clientId: "afcbd6f0-d34b-4512-bd24-c229815f53e5",
                  status: "active",
                  country: "GB",
                  currency: "GBP",
                  alias: "TCC GBP Test Account",
                  routingCodes: {},
                  iban: null,
                  accountNumber: null,
                  ledgerNumber: "41858872",
                  availableBalance: 0,
                  receivableBalance: 0,
                  accountHolderName: "I.F Technology Ltd",
                  accountHolderIdentityType: "corporate",
                  serviceProvider: "currencycloud",
                },
              ],
            },
            connect: "{}",
            metadata: {
              page: {
                size: 20,
                number: 0,
                totalElements: 1,
                totalPages: 1,
              },
            },
          },
        },
      },
    },
  },
  created_at: "2023-08-10T14:33:49.152403+00:00",
  request_method: "get",
  keys_to_keep: [
    "id",
    "accountHolderIdentityType",
    "clientId",
    "country",
    "currency",
    "ledgerNumber",
    "mainAccountId",
    "serviceProvider",
    "status",
    "iban",
    "accountNumber",
    "availableBalance",
    "payableBalance",
  ],
  api_id: "1234567",
} as unknown as Action;

export const realWorldExampleAction2 = {
  id: 7967,
  name: "list_outgoing_transfers",
  description: "List Outgoing Transfers",
  active: true,
  org_id: 192,
  tag: 4540,
  action_type: "http",
  path: "/outgoing-transfers",
  request_body_contents: null,
  parameters: [
    {
      name: "data.outgoingTransfer.transactionNumber",
      in: "query",
      required: false,
      schema: {
        type: "string",
      },
      description:
        "Find the data for a specific transaction number (e.g. 20230818-ASG36S6",
    },
    {
      name: "data.outgoingTransfer.amountFrom",
      in: "query",
      required: false,
      schema: {
        type: "string",
      },
      description: "Minimum amount",
    },
    {
      name: "data.outgoingTransfer.status",
      in: "query",
      required: false,
      schema: {
        type: "string",
        enum: [
          "pending",
          "processing",
          "released",
          "completed",
          "cancelled",
          "failed",
        ],
      },
      description: "transaction status",
    },
  ],
  responses: {
    "200": {
      description: "Outgoing transfer list returned",
      content: {
        "application/json": {
          schema: {
            required: ["connect", "data", "metadata", "workflow"],
            type: "object",
            properties: {
              workflow: {
                type: "object",
                description: "workflow container",
              },
              data: {
                type: "object",
                properties: {
                  outgoingTransfer: {
                    type: "object",
                    properties: {
                      transferDateFrom: {
                        type: "string",
                        format: "date",
                      },
                      transferDateTo: {
                        type: "string",
                        format: "date",
                      },
                      status: {
                        type: "array",
                        items: {
                          type: "string",
                          description: "status of outgoing transfer",
                          enum: [
                            "pending",
                            "on-hold",
                            "processing",
                            "released",
                            "completed",
                            "cancelled",
                            "failed",
                          ],
                        },
                      },
                      transactionNumber: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },
                      amountFrom: {
                        type: "number",
                      },
                      amountTo: {
                        type: "number",
                      },
                      currency: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },
                      description: {
                        type: "string",
                      },
                      clientId: {
                        type: "array",
                        items: {
                          type: "string",
                          format: "uuid",
                        },
                      },
                      accountId: {
                        type: "array",
                        items: {
                          type: "string",
                          format: "uuid",
                        },
                      },
                      serviceProviders: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },
                      serviceProviderId: {
                        type: "string",
                      },
                      serviceProviderReference: {
                        type: "string",
                      },
                    },
                  },
                  outgoingTransfers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        requirementConfiguration: {
                          type: "object",
                          properties: {
                            transferDateStatus: {
                              type: "string",
                              enum: [
                                "not-checked",
                                "not-required",
                                "not-fulfilled",
                                "fulfilled",
                              ],
                            },
                            complianceCheckStatus: {
                              type: "string",
                              enum: [
                                "not-checked",
                                "not-required",
                                "not-fulfilled",
                                "fulfilled",
                              ],
                            },
                            balanceCheckStatus: {
                              type: "string",
                              enum: [
                                "not-checked",
                                "not-required",
                                "not-fulfilled",
                                "fulfilled",
                              ],
                            },
                            authorizationStatusCheck: {
                              type: "string",
                              enum: [
                                "not-checked",
                                "not-required",
                                "not-fulfilled",
                                "fulfilled",
                              ],
                            },
                          },
                          description:
                            "Requirements configuration field to process the transfer",
                        },
                        rootTransaction: {
                          type: "object",
                          properties: {
                            id: {
                              type: "string",
                              format: "uuid",
                            },
                            transactionType: {
                              type: "string",
                              enum: [
                                "incoming-transfer",
                                "outgoing-transfer",
                                "exchange-transaction",
                                "generic-transaction",
                                "fund-collection-transfer",
                              ],
                            },
                            transactionNumber: {
                              type: "string",
                            },
                            operationalRouteCategory: {
                              type: "string",
                            },
                            clientId: {
                              type: "string",
                              format: "uuid",
                            },
                          },
                        },
                        id: {
                          type: "string",
                          description: "id of outgoing transfer",
                          format: "uuid",
                        },
                        transactionNumber: {
                          maxLength: 15,
                          minLength: 15,
                          type: "string",
                          description: "unique transaction number",
                          readOnly: true,
                        },
                        clientId: {
                          type: "string",
                          description: "id of client",
                          format: "uuid",
                        },
                        transferDate: {
                          type: "string",
                          description:
                            "date when transfer is executed, if account is not funded transfer will be rolled to next date and this field will be updated",
                          format: "date",
                        },
                        status: {
                          type: "string",
                          description: "status of outgoing transfer",
                          enum: [
                            "pending",
                            "on-hold",
                            "processing",
                            "released",
                            "completed",
                            "cancelled",
                            "failed",
                          ],
                        },
                        currency: {
                          maxLength: 3,
                          minLength: 3,
                          type: "string",
                          description:
                            "ISO 4217 currency code of outgoing transfer",
                        },
                        amount: {
                          type: "number",
                          description: "transfer amount",
                        },
                        feeCurrency: {
                          maxLength: 3,
                          minLength: 3,
                          type: "string",
                          description: "ISO 4217 currency code of fee",
                          readOnly: true,
                        },
                        feeAmount: {
                          type: "number",
                          description: "transfer fee amount",
                          readOnly: true,
                        },
                        description: {
                          type: "string",
                          description: "free text to send along with transfer",
                        },
                        incomingTransferId: {
                          type: "string",
                          description:
                            "id of created incoming transfer if this is an internal outgoing transfer",
                          format: "uuid",
                        },
                        transferReasonId: {
                          type: "string",
                          description: "id of transfer reason",
                          format: "uuid",
                        },
                        transferCustomReason: {
                          type: "string",
                          description:
                            "free text reason if transfer reason selected as other",
                        },
                        originalTransferDate: {
                          type: "string",
                          description:
                            "requested transfer date. this field won't be updated even if the transfer is rolled to next date",
                          format: "date",
                        },
                        cutOffDateTime: {
                          type: "string",
                          description: "cutoff time in current transfer date",
                          format: "date-time",
                        },
                        rollCount: {
                          type: "integer",
                          description:
                            "how many times a transfer is rolled since account is unfunded until cutoff time",
                          format: "int32",
                        },
                        onBehalfOf: {
                          type: "string",
                          format: "uuid",
                        },
                        schemeAttributes: {
                          type: "object",
                          description:
                            "currency/country specific scheme attributes",
                        },
                        destination: {
                          required: ["type"],
                          type: "object",
                          properties: {
                            type: {
                              type: "string",
                            },
                          },
                          description:
                            "outgoing transfer destination container",
                          discriminator: {
                            propertyName: "type",
                          },
                        },
                        ownerType: {
                          type: "string",
                          description: "owner of the outgoing transfer",
                          enum: ["client", "instance"],
                        },
                        beneficiary: {
                          type: "object",
                          properties: {
                            fullName: {
                              type: "string",
                            },
                            identity: {
                              required: ["type"],
                              type: "object",
                              properties: {
                                type: {
                                  type: "string",
                                },
                              },
                              discriminator: {
                                propertyName: "type",
                                mapping: {
                                  corporate:
                                    "#/components/schemas/LegalEntityIdentityCorporate",
                                  individual:
                                    "#/components/schemas/LegalEntityIdentityIndividual",
                                },
                              },
                            },
                            address: {
                              required: ["city", "country"],
                              type: "object",
                              properties: {
                                country: {
                                  maxLength: 2,
                                  minLength: 2,
                                  pattern: "^[A-Z]{2}$",
                                  type: "string",
                                },
                                region: {
                                  type: "string",
                                },
                                city: {
                                  type: "string",
                                },
                                street: {
                                  type: "string",
                                },
                                refinement: {
                                  type: "string",
                                },
                                postalCode: {
                                  type: "string",
                                },
                                houseNumber: {
                                  type: "string",
                                },
                              },
                            },
                            account: {
                              type: "object",
                              properties: {
                                accountHolderName: {
                                  type: "string",
                                },
                                country: {
                                  type: "string",
                                },
                                currency: {
                                  type: "string",
                                },
                                routingCodes: {
                                  type: "object",
                                },
                                accountNumber: {
                                  type: "string",
                                },
                                iban: {
                                  type: "string",
                                },
                                ledgerNumber: {
                                  type: "string",
                                },
                                alias: {
                                  type: "string",
                                },
                              },
                            },
                          },
                          description: "beneficiary",
                        },
                        source: {
                          required: ["type"],
                          type: "object",
                          properties: {
                            type: {
                              type: "string",
                            },
                          },
                          discriminator: {
                            propertyName: "type",
                          },
                        },
                        scheme: {
                          type: "string",
                          description:
                            "transfer scheme depending on the scope of the transfer",
                          enum: [
                            "swift",
                            "local",
                            "sepa",
                            "sepa-instant",
                            "chaps",
                            "bacs",
                            "faster-payments",
                            "ach",
                            "wire",
                          ],
                        },
                        totalAmount: {
                          type: "number",
                          description:
                            "total amount including fee, filled if charging method is on-source",
                        },
                        scope: {
                          type: "string",
                          description: "transfer scope",
                          enum: [
                            "internal",
                            "external",
                            "internal",
                            "external",
                          ],
                        },
                      },
                      description: "outgoing transfer model",
                      readOnly: true,
                    },
                  },
                },
                description: "data container",
              },
              connect: {
                type: "object",
                description: "connect container",
              },
              metadata: {
                required: ["page"],
                type: "object",
                properties: {
                  page: {
                    required: ["number", "size", "totalElements", "totalPages"],
                    type: "object",
                    properties: {
                      size: {
                        minimum: 0,
                        type: "integer",
                        description: "number of elements in this page",
                        format: "int32",
                      },
                      number: {
                        minimum: 0,
                        type: "integer",
                        description: "index of page starting from 0",
                        format: "int32",
                      },
                      totalElements: {
                        minimum: 0,
                        type: "integer",
                        description:
                          "total number of elements in all of the pages",
                        format: "int64",
                        readOnly: true,
                      },
                      totalPages: {
                        minimum: 0,
                        type: "integer",
                        description: "number of total pages",
                        format: "int32",
                        readOnly: true,
                      },
                    },
                  },
                },
                description: "metadata container",
              },
            },
            description: "response model",
          },
        },
      },
    },
  },
  created_at: "2023-08-22T15:38:34.16405+00:00",
  request_method: "get",
  keys_to_keep: [
    "id",
    "clientId",
    "accountId",
    "transactionNumber",
    "status",
    "currency",
    "amount",
    "feeAmount",
    "outgoingTransferId",
    "senderName",
    "transferDate",
    "serviceProviderReference",
    "scope",
    "sort-code",
    "iban",
    "scheme",
    "ledgerNumber",
    "requirementConfiguration",
    "transferDateStatus",
    "complianceCheckStatus",
    "balanceCheckStatus",
    "authorizationStatusCheck",
  ],
  api_id: "91beef5d-bf58-4147-9030-1328ccfdee3e",
} as unknown as Action;

export const realWorldExampleAction3 = {
  id: 7967,
  name: "filter_demand",
  description: "List demand",
  active: true,
  org_id: 192,
  tag: 4540,
  action_type: "http",
  path: "/filter_demand",
  request_body_contents: null,
  parameters: [],
  responses: {
    "200": {
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "timeline"],
              properties: {
                id: {
                  type: "integer",
                  description: "Item id",
                },
                timeline: {
                  type: "array",
                  items: {
                    required: ["demand", "period", "picks", "forecast"],
                    type: "object",
                    properties: {
                      demand: {
                        type: "integer",
                        format: "int64",
                        description:
                          "The number of items sold (not their value)",
                      },
                      forecast: {
                        type: "number",
                        description:
                          "The forecast demand for a future period, or previously-forecast demand for a past period",
                      },
                      period: {
                        type: "string",
                        description: "The period the figures are reported for",
                      },
                      picks: {
                        type: "integer",
                        format: "int64",
                        description:
                          "The number of times a customer buys any number of this item type (1 pick often corresponds to many items sold)",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      description: "OK",
    },
  },
  created_at: "2023-08-10T14:33:49.152403+00:00",
  request_method: "get",
  keys_to_keep: null,
  api_id: "91beef5d-bf58-4147-9030-1328ccfdee3e",
} as unknown as Action;
