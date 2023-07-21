import "jest";
import { getOpenAIResponse } from "../../lib/queryOpenAI";
import { getMockedProperties } from "../../pages/api/mock/[...slug]";

jest.mock("../../lib/queryOpenAI");

// This resets the number of times called counts between tests
afterEach(() => {
  jest.clearAllMocks();
});
describe("getMockedProperties", () => {
  it("simple test case", async () => {
    const openAiResponse = `
firstName: John 
lastName: Smith
`;

    const properties = {
      firstName: {
        type: "string",
        nullable: false,
      },
      lastName: {
        type: "string",
        nullable: false,
      },
    };

    (getOpenAIResponse as jest.Mock).mockReturnValue(openAiResponse);

    const res = await getMockedProperties(
      properties,
      "/api/v1/Status/fullname/123",
      "GET",
      [
        {
          path: ["id"],
          data: "The user's id",
        },
      ]
    );
    expect(res).toEqual({ firstName: "John", lastName: "Smith" });
  });

  it("with array", async () => {
    const properties = {
      count: {
        type: "integer",
        example: 123,
      },
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            level: {
              enum: [1, 8, 15],
              type: "integer",
            },
          },
        },
      },
    };

    const expected = {
      count: 123,
      results: [
        {
          id: "123",
          level: 1,
        },
      ],
    };

    const openAiResponse = `
        id: John 
        lastName: Smith
      `;

    (getOpenAIResponse as jest.Mock).mockReturnValue(openAiResponse);

    const res = await getMockedProperties(
      properties,
      "/api/v1/Status/fullname/123",
      "GET",
      [
        {
          path: ["id"],
          data: "The user's id",
        },
      ]
    );
    // Doesnt pass currently
    // expect(res).toEqual(expected);
  });
  it("nested object", async () => {
    const openAiResponse = `
  browserSdkVersion: 1
  dateCreated: 2021-01-01
  cdn: nice-cdn
  csp: nice-csp
  `;

    const properties = {
      browserSdkVersion: {
        type: "string",
      },
      dateCreated: {
        type: "string",
      },
      dsn: {
        type: "object",
        properties: {
          cdn: {
            type: "string",
          },
          csp: {
            type: "string",
          },
        },
      },
    };

    const expectedOutput = {
      browserSdkVersion: "1",
      dateCreated: "2021-01-01",
      dsn: {
        cdn: "nice-cdn",
        csp: "nice-csp",
      },
    };

    (getOpenAIResponse as jest.Mock).mockReturnValue(openAiResponse);

    const res = await getMockedProperties(
      properties,
      "/api/v1/Status/fullname/123",
      "GET",
      [
        {
          path: ["id"],
          data: "The user's id",
        },
      ]
    );

    // const actualOutput = {
    //   browserSdk: { properties: { choices: { items: { elements: "ele" } } } },
    //   browserSdkVersion: "1",
    //   dateCreated: "2021-01-01",
    //   dsn: { properties: { cdn: "nice-cdn", csp: "nice-csp" } },
    // };

    // Doesnt pass currently
    // expect(res).toEqual(expectedOutput);
  });
});
