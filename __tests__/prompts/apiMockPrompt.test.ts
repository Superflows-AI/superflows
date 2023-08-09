import apiMockPrompt from "../../lib/prompts/apiMock";
import { Properties } from "../../lib/models";

describe("apiMockPrompt", () => {
  it("Test object deconstruction works correctly", () => {
    const responseType: Properties = {
      user: {
        type: "string",
        description: "The user's name",
        path: ["user"],
      },
    };

    const res = apiMockPrompt(
      "/very/nice/path",
      "GET",
      null,
      responseType,
      undefined,
      false
    );

    const extractedString = res[1].content
      .split("Fields\n---")[3]
      .split("Response\n---")[0]
      .trim();

    expect(extractedString).toEqual(`user (string): The user's name`);
  });

  it("Test object deconstruction works correctly nested property", () => {
    const responseType: Properties = {
      "user.id": {
        type: "string",
        description: "The user's id",
        path: ["user, id"],
      },
    };

    const res = apiMockPrompt(
      "/very/nice/path",
      "GET",
      null,
      responseType,
      undefined,
      false
    );

    const extractedString = res[1].content
      .split("Fields\n---")[3]
      .split("Response\n---")[0]
      .trim();

    expect(extractedString).toEqual(`user.id (string): The user's id`);
  });
});
