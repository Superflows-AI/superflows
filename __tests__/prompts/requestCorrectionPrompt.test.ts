import requestCorrectionPrompt, {
  extractParamDetails,
} from "../../lib/prompts/requestCorrection";
import { Action } from "../../lib/types";

const action: Action = {
  action_type: "sample_action",
  active: true,
  api_id: "12345",
  created_at: "2020-01-01",
  description: "Sample description",
  id: 1,
  keys_to_keep: {},
  name: "sampleAction",
  org_id: 1,
  parameters: {},
  request_body_contents: {
    "application/json": {
      schema: {
        type: "object",
        required: ["conversation_id"],
        properties: {
          conversation_id: {
            type: "number",
            description: "The ID of the conversation",
          },
        },
      },
    },
  },
  path: "/sample_path",
  request_method: "get",
  responses: {},
  tag: 1,
};

describe("requestCorrectionPrompt function", () => {
  it("test that action is processed correctly", () => {
    const expected = `


Parameter
---

conversation_id (number): The ID of the conversation. REQUIRED

Response
---

`;

    const result = requestCorrectionPrompt("conversation_id", action);

    expect(result).not.toBeNull();

    expect(
      result![0].content.split(
        `Provide a response for the parameter below. Follow the format exactly from the examples above. Output only the response or "ask user". Do not output the parameter name or description.`
      )[1]
    ).toEqual(expected);
  });

  it("parameter not in action", () => {
    const result = requestCorrectionPrompt(
      "TheDaysWentOnAndIthoughtThisIsPoorRapport",
      action
    );
    expect(result).toEqual(null);
  });
});

describe("Test extractParamDetails function", () => {
  it("should correctly extract parameter with type and description", () => {
    const query = `
    Time, he's waiting in the wings
He speaks of senseless things
His script is you and me, boy
    - time (string): he flexes like a
    - falls (number): to the floor
    - his_trick (string): is you and me
    - boy (string)
    - exampleParam (string): This is an example parameter`;
    const paramName = "exampleParam";
    expect(extractParamDetails(query, paramName)).toEqual(
      "exampleParam (string): This is an example parameter"
    );
  });

  it("should return null when the parameter does not exist in the query", () => {
    const query =
      "- anotherExample (number): This is another example parameter";
    const paramName = "nonExistingParam";
    expect(extractParamDetails(query, paramName)).toEqual(null);
  });

  it("should correctly extract parameter no description", () => {
    const query = `
    Time, in quaaludes and red wine
Demanding Billy Dolls
And other friends of mine
Take your time
    
    - exampleParam (number)`;
    const paramName = "exampleParam";
    expect(extractParamDetails(query, paramName)).toEqual(
      "exampleParam (number)"
    );
  });

  it("should handle numerical value in the parameter names", () => {
    const query = `
    The sniper in the brain 
    regurgitating drain
    - exampleParam1 (string): This is an example parameter with a numerical value in its name`;
    const paramName = "exampleParam1";
    expect(extractParamDetails(query, paramName)).toEqual(
      "exampleParam1 (string): This is an example parameter with a numerical value in its name"
    );
  });

  it("should handle spaces in the parameter names", () => {
    const query = `- example_param (string): This is an example parameter with underscores in its name.`;
    const paramName = "example_param";
    expect(extractParamDetails(query, paramName)).toEqual(
      "example_param (string): This is an example parameter with underscores in its name."
    );
  });
});
