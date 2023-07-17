import { describe, expect, it } from "@jest/globals";
import { jsonReconstruct, jsonSplitter } from "../../lib/utils";

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
    console.log(res["200"].content["application/json"]);
    console.log(obj["200"].content["application/json"]);
    expect(res).toEqual(obj);
  });
});
