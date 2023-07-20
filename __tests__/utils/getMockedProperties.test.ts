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

// This resets the number of times called counts between tests
afterEach(() => {
  jest.clearAllMocks();
});

describe("getMockedProperties", () => {
  it("should return the mocked properties", async () => {
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
});
