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
