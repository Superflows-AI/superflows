import { ChatGPTMessage, RequestMethods } from "../models";
import { objectNotEmpty } from "../utils";

export default function apiMockPrompt(
  slug: string[],
  requestMethod: RequestMethods,
  queryParameters: { [key: string]: any },
  requestBodyParameters: { [key: string]: any },
  expectedResponseType: { [key: string]: any },
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
Your task is to generate a response to mock the API and respond to the user's request.

The user is sending a ${requestMethod} request to the ${slug.join(
        "/"
      )} endpoint.
${
  objectNotEmpty(queryParameters)
    ? `The user is sending the following query parameters: ${JSON.stringify(
        queryParameters
      )}.`
    : ""
}
${
  objectNotEmpty(requestBodyParameters)
    ? `The user is sending the following request body parameters: ${JSON.stringify(
        requestBodyParameters
      )}.`
    : ""
}
${
  objectNotEmpty(expectedResponseType)
    ? `The expected response type is ${JSON.stringify(
        expectedResponseType,
        null,
        2
      )}.`
    : ""
}

Your response should be a valid JSON. Include only the JSON. Do not include any extra information.
`,
    },
  ];
}
