import "jest";
import { getOpenAIResponse } from "../../lib/queryOpenAI";
import { getMockedProperties } from "../../pages/api/mock/[...slug]";

// jest.mock("../lib/queries", () => {
//   return {
//     __esModule: true,
//     ...jest.requireActual("../lib/queries"),
//   };
// });
jest.mock("../../lib/queryOpenAI");

// beforeEach(async () => {
//   return await clearTables();
// });
// afterEach(async () => {
//   return await clearTables();
// });
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
  it("more complex test case", async () => {
    const openAiResponse = `
elements: ele
browserSdkVersion: 1
dateCreated: 2021-01-01
cdn: nice-cdn
csp: nice-csp
`;

    const properties = {
      browserSdk: {
        type: "object",
        properties: {
          choices: {
            type: "array",
            items: {
              type: "array",
              elements: {
                type: "string",
              },
            },
          },
        },
      },
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
      browserSdk: {
        choices: ["ele"], // might be wrong
      },
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
    console.log("HI tHERE", JSON.stringify(res));
    // const actualOput = {
    //   browserSdk: { properties: { choices: { items: { elements: "ele" } } } },
    //   browserSdkVersion: "1",
    //   dateCreated: "2021-01-01",
    //   dsn: { properties: { cdn: "nice-cdn", csp: "nice-csp" } },
    // };
    expect(res).toEqual(expectedOutput);
  });
});
