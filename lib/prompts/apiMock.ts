import { ChatGPTMessage, RequestMethods } from "../models";
import { objectNotEmpty } from "../utils";

export default function apiMockPrompt(
  path: string,
  requestMethod: RequestMethods,
  pathParameters: { [key: string]: any },
  queryParameters: { [key: string]: any },
  requestBodyParameters: { [key: string]: any },
  expectedResponseType: object,
  orgInfo?: {
    name: string;
    description: string;
  }
): ChatGPTMessage[] {
  // TODO: Maybe add Examples to prompt type as e.g for retrieve_event_counts_for_a_team it's required to infer the shape of
  // the array they want back
  return [
    {
      role: "system",
      content: `The user is sending a request to ${
        orgInfo ? `${orgInfo.name}'s` : "an"
      } API. ${
        orgInfo ? orgInfo.description : ""
      } However, they do not have access to the real API. 
Your task is to generate a response to mock the API and respond to the user's request.`,
    },
    {
      role: "user",
      content: `
I am sending a ${requestMethod} request to the ${path} endpoint.
${
  objectNotEmpty(queryParameters)
    ? `I am sending the following query parameters: ${JSON.stringify(
        queryParameters
      )}.`
    : ""
}
${
  objectNotEmpty(pathParameters)
    ? `I am sending the following path parameters: ${JSON.stringify(
        pathParameters
      )}.`
    : ""
}
${
  objectNotEmpty(requestBodyParameters)
    ? `I am is sending the following request body parameters: ${JSON.stringify(
        requestBodyParameters
      )}.`
    : ""
}
${
  objectNotEmpty(expectedResponseType)
    ? `Your response should be JSON of a specific type. Below are examples of how to generate a response from a type.

    Type:
    {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "description": "The id of the customer",
          },
          "name": {
            "type": "string",
            "description": "the name of the customer",
            "nullable": true
          },
          "birthday": {
            "type": "string",
            "description": "The customer's birthday",
            "nullable": true
          }
        }
      }
    }
    Response:
    [
      {
        "id": 123,
        "name": "John Doe",
        "birthday": "1990-01-01"
      }
    ]

    Type:
    {
      "type": "object",
      "items": {
        "type": "object",
        "required": [
          "dateCreated",
          "id"
        ],
        "properties": {
          "dateCreated": {
            "type": "string",
            "format": "date-time"
          },
          "id": {
            "type": "string"
          },
          "message": {
            "type": "string",
            "nullable": true
          }
          "notes": {
            "type": "string",
            "nullable": true
          }
        }
      }
    }
    Response:
    {
      "dateCreated": "2021-01-01T00:00:00.000Z",
      "id": "123",
      "message": "Hello world!",
      "notes": null
    }

    Provide a valid JSON response. Include only JSON. All fields in the "Type" must be included. Avoid using null.

    Type:
    ${JSON.stringify(expectedResponseType, null, 2)}.

    Response:

    `
    : "Your response should be a valid JSON. Include only the JSON. Do not include any extra information."
}
`,
    },
  ];
}
