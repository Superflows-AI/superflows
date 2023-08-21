import { FunctionCall } from "@superflows/chat-ui-react";
import "jest";
import { getMissingArgCorrections } from "../lib/edge-runtime/missingParamCorrection";
import { getOpenAIResponse } from "../lib/queryOpenAI";
import { Action } from "../lib/types";
import getMessages from "../lib/prompts/chatBot";
jest.mock("../lib/queryOpenAI");

const constActionParams = {
  action_type: "http",
  active: true,
  id: 1,
  org_id: 1,
  keys_to_keep: null,
  tag: null,
  responses: null,
  created_at: "2021-08-15T20:00:00.000Z",
  name: "testAction",
  description: "",
  api_id: "12345",
};

describe("missingParamCorrection", () => {
  it("GET - missing query param correction", async () => {
    const action: Action = {
      ...constActionParams,
      parameters: [
        {
          name: "paramToBeMissing",
          in: "path",
          description: "This is a description",
          required: true,
          schema: {
            type: "string",
          },
        },
      ],
      path: "/api/path/{paramToBeMissing}",
      request_method: "GET",
      request_body_contents: { "application/json": { schema: {} } },
    };

    (getOpenAIResponse as jest.Mock).mockReturnValue(
      "i-saw-the-best-minds-of-my-generation-destroyed-by-madness-starving-hysterical-naked"
    );

    const originalCommand = {
      name: "testAction",
      args: { paramThatsNotMissing: "abc123" },
    };

    const previousConversation = getMessages(
      [],
      [action],
      "very lovely user",
      { name: "", description: "" },
      null
    );

    const correctedCommand = await getMissingArgCorrections(
      action,
      originalCommand as FunctionCall,
      previousConversation
    );

    const expected = {
      paramToBeMissing:
        "i-saw-the-best-minds-of-my-generation-destroyed-by-madness-starving-hysterical-naked",
    };
    expect(correctedCommand.corrections).toEqual(expected);
  });

  it("POST - missing required body param", async () => {
    (getOpenAIResponse as jest.Mock).mockReturnValue("1976");

    const action: Action = {
      ...constActionParams,
      parameters: null,
      path: "/leekspin/confirm",
      request_method: "POST",
      request_body_contents: {
        "application/json": {
          schema: {
            type: "object",
            required: ["paramToBeMissing"],
            properties: {
              paramToBeMissing: {
                description: "This is a description",
                type: "number",
              },
            },
          },
        },
      },
    };

    const originalCommand = {
      name: "testAction",
      args: { paramThatsNotMissing: "abc123" },
    };

    const previousConversation = getMessages(
      [],
      [action],
      "",
      { name: "", description: "" },
      null
    );

    const correctedCommand = await getMissingArgCorrections(
      action,
      originalCommand as FunctionCall,
      previousConversation
    );

    const expected = {
      paramToBeMissing: 1976,
    };

    expect(correctedCommand.corrections).toEqual(expected);
  });
  it("GET - missing multiple query params corrections", async () => {
    const action: Action = {
      ...constActionParams,
      parameters: [
        {
          name: "firstParamToBeMissing",
          in: "path",
          description: "This is a description for the first missing parameter",
          required: true,
          schema: {
            type: "string",
          },
        },
        {
          name: "secondParamToBeMissing",
          in: "path",
          description: "This is a description for the second missing parameter",
          required: true,
          schema: {
            type: "string",
          },
        },
      ],
      path: "/api/path/{firstParamToBeMissing}/{secondParamToBeMissing}",
      request_method: "GET",
      request_body_contents: { "application/json": { schema: {} } },
    };

    (getOpenAIResponse as jest.Mock)
      .mockReturnValueOnce(
        "i-saw-the-best-minds-of-my-generation-destroyed-by-madness-starving-hysterical-naked"
      )
      .mockReturnValueOnce(
        "angelheaded-hipsters-burning-for-the-ancient-heavenly-connection-to-the-starry-dynamo"
      );

    const originalCommand = {
      name: "testAction",
      args: { paramThatsNotMissing: "abc123" },
    };

    const previousConversation = getMessages(
      [],
      [action],
      "",
      { name: "", description: "" },
      null
    );

    const correctedCommand = await getMissingArgCorrections(
      action,
      originalCommand as FunctionCall,
      previousConversation
    );

    const expected = {
      firstParamToBeMissing:
        "i-saw-the-best-minds-of-my-generation-destroyed-by-madness-starving-hysterical-naked",
      secondParamToBeMissing:
        "angelheaded-hipsters-burning-for-the-ancient-heavenly-connection-to-the-starry-dynamo",
    };
    expect(correctedCommand.corrections).toEqual(expected);
  });

  it("POST - missing required multiple body params", async () => {
    (getOpenAIResponse as jest.Mock)
      .mockReturnValueOnce("1976")
      .mockReturnValueOnce("2020");

    const action: Action = {
      ...constActionParams,
      parameters: null,
      path: "/leekspin/confirm",
      request_method: "POST",
      request_body_contents: {
        "application/json": {
          schema: {
            type: "object",
            required: ["firstParamToBeMissing", "secondParamToBeMissing"],
            properties: {
              firstParamToBeMissing: {
                description:
                  "This is a description for the first missing body parameter",
                type: "number",
              },
              secondParamToBeMissing: {
                description:
                  "This is a description for the second missing body parameter",
                type: "number",
              },
            },
          },
        },
      },
    };

    const originalCommand = {
      name: "testAction",
      args: { paramThatsNotMissing: "abc123" },
    };

    const previousConversation = getMessages(
      [],
      [action],
      "",
      { name: "", description: "" },
      null
    );

    const correctedCommand = await getMissingArgCorrections(
      action,
      originalCommand as FunctionCall,
      previousConversation
    );

    const expected = {
      firstParamToBeMissing: 1976,
      secondParamToBeMissing: 2020,
    };
    expect(correctedCommand.corrections).toEqual(expected);
  });

  it(" POST -  missing query and body params", async () => {
    const action: Action = {
      ...constActionParams,
      parameters: [
        {
          name: "queryParamToBeMissing",
          in: "path",
          description: "This is a description for the missing query parameter",
          required: true,
          schema: {
            type: "string",
          },
        },
      ],
      path: "/api/path/{queryParamToBeMissing}",
      request_method: "GET",
      request_body_contents: {
        "application/json": {
          schema: {
            type: "object",
            required: ["bodyParamToBeMissing"],
            properties: {
              bodyParamToBeMissing: {
                description:
                  "This is a description for the missing body parameter",
                type: "number",
              },
            },
          },
        },
      },
    };

    (getOpenAIResponse as jest.Mock)
      .mockReturnValueOnce("1976")
      .mockReturnValueOnce("missing-query-param-value");

    const originalCommand = {
      name: "testAction",
      args: { paramThatsNotMissing: "abc123" },
    };
    const previousConversation = getMessages(
      [],
      [action],
      "",
      { name: "", description: "" },
      null
    );

    const correctedCommand = await getMissingArgCorrections(
      action,
      originalCommand as FunctionCall,
      previousConversation
    );

    const expected = {
      queryParamToBeMissing: "missing-query-param-value",
      bodyParamToBeMissing: 1976,
    };
    expect(correctedCommand.corrections).toEqual(expected);
  });
});
