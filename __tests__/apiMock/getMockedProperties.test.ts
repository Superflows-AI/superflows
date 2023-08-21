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

    const openApiProperties = {
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
      openApiProperties,
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
    const openApiProperties = {
      id: {
        type: "string",
      },
      name: {
        type: "integer",
      },
    };

    const openAiResponse = `
        id: [1,2,3]
        name: ['John', 'Eric', 'Martin']
      `;

    const expected = [
      {
        id: 1,
        name: "John",
      },
      {
        id: 2,
        name: "Eric",
      },
      {
        id: 3,
        name: "Martin",
      },
    ];

    (getOpenAIResponse as jest.Mock).mockReturnValue(openAiResponse);

    const res = await getMockedProperties(
      openApiProperties,
      "/api/v1/Status/fullname/123",
      "GET",
      null,
      undefined,
      true
    );
    expect(res).toEqual(expected);
  });
  it("nested object", async () => {
    // TODO: remove properties from here
    // learney.atlassian.net/browse/SF-2007
    const openAiResponse = `
  browserSdkVersion: 1
  dateCreated: 2021-01-01
  dsn.properties.cdn: nice-cdn
  dsn.properties.csp: nice-csp
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

    (getOpenAIResponse as jest.Mock).mockReturnValue(openAiResponse);

    const expectedOutput = {
      browserSdkVersion: 1,
      dateCreated: "2021-01-01",
      dsn: { cdn: "nice-cdn", csp: "nice-csp" },
    };

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

    expect(res).toEqual(expectedOutput);
  });
});
