import { ChatGPTMessage, RequestMethods } from "../models";
import { objectNotEmpty } from "../utils";

export default function apiMockPrompt(
  slug: string[],
  requestMethod: RequestMethods,
  queryParameters: { [key: string]: any },
  requestBodyParameters: { [key: string]: any },
  expectedResponseType: object,
  orgInfo?: {
    name: string;
    description: string;
  }
): ChatGPTMessage[] {
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
I am sending a ${requestMethod} request to the ${slug.join("/")} endpoint.
${
  objectNotEmpty(queryParameters)
    ? `I am sending the following query parameters: ${JSON.stringify(
        queryParameters
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
      {
        "name": "string",
        "description": "The name of the customer"
        nullable: false
      },
      {
        "id": "integer",
        "description": "The internal ID of the customer"
        nullable: false
      },
      {
        "birthday": "",
        "description": "The customer's birthday"
        nullable: true
      }
    }

    Response:
    {
      name: "John Doe",
      id: 123
      birthday: null
    }

    Type:
    {
      {
        "location": "string",
        "description": "Where is the customer's house located"
        nullable: false
      },
      {
        "id": "integer",
        "description": "The internal ID of the customer"
        nullable: false
      },
      {
        "notes": "string",
        "description": "Notes about the customer's case"
        nullable: true
      }
    }

    Response:
    {
      location: "New york ",
      id: 999
      notes: "Customer is a VIP"
    }

    Complete the following response with a valid JSON. Include only the JSON. Do not include any extra information.

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
