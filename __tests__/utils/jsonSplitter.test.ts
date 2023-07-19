import { describe, expect, it } from "@jest/globals";
import { jsonReconstruct, jsonSplitter } from "../../lib/utils";
// import jiraSpec from "../testData/jira-openapi-spec.json";
import reddit from "../testData/askReddit.json";

describe("Parse output", () => {
  it("simple object", () => {
    const obj = { name: "John", age: 30, city: "New York" };

    const split = jsonSplitter(obj);
    const res = jsonReconstruct(split);
    expect(res).toStrictEqual(obj);
  });
  it("complex object", () => {
    const obj = {
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: {
              type: "array",
              items: {
                type: "object",
                required: [
                  "environment",
                  "name",
                  "dateStarted",
                  "dateFinished",
                  "url",
                  "id",
                ],
                properties: {
                  environment: {
                    type: "string",
                  },
                  name: {
                    type: "string",
                    nullable: true,
                  },
                  dateStarted: {
                    type: "string",
                    format: "date-time",
                    nullable: true,
                  },
                  dateFinished: {
                    type: "string",
                    format: "date-time",
                  },
                  url: {
                    type: "string",
                    nullable: true,
                  },
                  id: {
                    type: "string",
                  },
                },
              },
            },
            example: [
              {
                environment: "prod",
                name: null,
                url: null,
                dateStarted: null,
                dateFinished: "2020-08-31T19:40:38.651670Z",
                id: "1234567",
              },
            ],
          },
        },
      },
      "403": {
        description: "Forbidden",
      },
      "404": {
        description: "Not Found",
      },
    };

    const split = jsonSplitter(obj);
    const res = jsonReconstruct(split);
    expect(res).toEqual(obj);
  });

  it("very complex object", () => {
    const obj = {
      "200": {
        description: "Returned if the request is successful.",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                limit: {
                  type: "integer",
                  description:
                    "The requested or default limit on the number of audit items to be returned.",
                  format: "int32",
                  readOnly: true,
                },
                offset: {
                  type: "integer",
                  description:
                    "The number of audit items skipped before the first item in this list.",
                  format: "int32",
                  readOnly: true,
                },
                records: {
                  type: "array",
                  description: "The list of audit items.",
                  readOnly: true,
                  items: {
                    type: "object",
                    properties: {
                      associatedItems: {
                        type: "array",
                        description:
                          "The list of items associated with the changed record.",
                        readOnly: true,
                        items: {
                          type: "object",
                          properties: {
                            id: {
                              type: "string",
                              description: "The ID of the associated record.",
                              readOnly: true,
                            },
                            name: {
                              type: "string",
                              description: "The name of the associated record.",
                              readOnly: true,
                            },
                            parentId: {
                              type: "string",
                              description:
                                "The ID of the associated parent record.",
                              readOnly: true,
                            },
                            parentName: {
                              type: "string",
                              description:
                                "The name of the associated parent record.",
                              readOnly: true,
                            },
                            typeName: {
                              type: "string",
                              description: "The type of the associated record.",
                              readOnly: true,
                            },
                          },
                          additionalProperties: false,
                          description:
                            "Details of an item associated with the changed record.",
                        },
                      },
                      authorKey: {
                        type: "string",
                        description:
                          "Deprecated, use `authorAccountId` instead. The key of the user who created the audit record.",
                        readOnly: true,
                      },
                      category: {
                        type: "string",
                        description:
                          "The category of the audit record. For a list of these categories, see the help article [Auditing in Jira applications](https://confluence.atlassian.com/x/noXKM).",
                        readOnly: true,
                      },
                      changedValues: {
                        type: "array",
                        description:
                          "The list of values changed in the record event.",
                        readOnly: true,
                        items: {
                          type: "object",
                          properties: {
                            changedFrom: {
                              type: "string",
                              description:
                                "The value of the field before the change.",
                              readOnly: true,
                            },
                            changedTo: {
                              type: "string",
                              description:
                                "The value of the field after the change.",
                              readOnly: true,
                            },
                            fieldName: {
                              type: "string",
                              description: "The name of the field changed.",
                              readOnly: true,
                            },
                          },
                          additionalProperties: false,
                          description:
                            "Details of names changed in the record event.",
                        },
                      },
                      created: {
                        type: "string",
                        description:
                          "The date and time on which the audit record was created.",
                        format: "date-time",
                        readOnly: true,
                      },
                      description: {
                        type: "string",
                        description: "The description of the audit record.",
                        readOnly: true,
                      },
                      eventSource: {
                        type: "string",
                        description:
                          "The event the audit record originated from.",
                        readOnly: true,
                      },
                      id: {
                        type: "integer",
                        description: "The ID of the audit record.",
                        format: "int64",
                        readOnly: true,
                      },
                      objectItem: {
                        type: "object",
                        properties: {
                          id: {
                            type: "string",
                            description: "The ID of the associated record.",
                            readOnly: true,
                          },
                          name: {
                            type: "string",
                            description: "The name of the associated record.",
                            readOnly: true,
                          },
                          parentId: {
                            type: "string",
                            description:
                              "The ID of the associated parent record.",
                            readOnly: true,
                          },
                          parentName: {
                            type: "string",
                            description:
                              "The name of the associated parent record.",
                            readOnly: true,
                          },
                          typeName: {
                            type: "string",
                            description: "The type of the associated record.",
                            readOnly: true,
                          },
                        },
                        additionalProperties: false,
                        description:
                          "Details of an item associated with the changed record.",
                      },
                      remoteAddress: {
                        type: "string",
                        description:
                          "The URL of the computer where the creation of the audit record was initiated.",
                        readOnly: true,
                      },
                      summary: {
                        type: "string",
                        description: "The summary of the audit record.",
                        readOnly: true,
                      },
                    },
                    additionalProperties: false,
                    description: "An audit record.",
                  },
                },
                total: {
                  type: "integer",
                  description: "The total number of audit items returned.",
                  format: "int64",
                  readOnly: true,
                },
              },
              additionalProperties: false,
              description: "Container for a list of audit records.",
            },
            example:
              '{"offset":0,"limit":1000,"total":1,"records":[{"id":1,"summary":"User created","remoteAddress":"192.168.1.1","authorKey":"administrator","authorAccountId":"5ab8f18d741e9c2c7e9d4538","created":"2014-03-19T18:45:42.967+0000","category":"user management","eventSource":"Jira Connect Plugin","description":"Optional description","objectItem":{"id":"user","name":"user","typeName":"USER","parentId":"1","parentName":"Jira Internal Directory"},"changedValues":[{"fieldName":"email","changedFrom":"user@atlassian.com","changedTo":"newuser@atlassian.com"}],"associatedItems":[{"id":"jira-software-users","name":"jira-software-users","typeName":"GROUP","parentId":"1","parentName":"Jira Internal Directory"}]}]}',
          },
        },
      },
      "401": {
        description:
          "Returned if the authentication credentials are incorrect or missing.",
      },
      "403": {
        description:
          "Returned if:\n\n *  the user does not have the required permissions.\n *  all Jira products are on free plans. Audit logs are available when at least one Jira product is on a paid plan.",
      },
    };
    const split = jsonSplitter(obj);
    const res = jsonReconstruct(split);
    expect(res).toEqual(obj);
  });

  it("ask Reddit ", () => {
    const split = jsonSplitter(reddit);
    const res = jsonReconstruct(split);
    storeData(res, "result.json");
    expect(res).toEqual(reddit);
  });
});

const fs = require("fs");

const storeData = (data, path) => {
  try {
    fs.writeFileSync(path, JSON.stringify(data));
  } catch (err) {
    console.error(err);
  }
};
