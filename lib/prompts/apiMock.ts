import {
  ChatGPTMessage,
  Chunk,
  OpenAPISchema,
  Properties,
  RequestMethod,
} from "../models";
import { chunkToString, objectNotEmpty } from "../utils";

export default function apiMockPrompt(
  path: string,
  requestMethod: RequestMethod,
  requestParameters: Chunk[] | null,
  responseType: Properties | null,
  orgInfo?: {
    name: string;
    description: string;
  }
): ChatGPTMessage[] {
  // TODO: Maybe add Examples to prompt type as e.g for retrieve_event_counts_for_a_team it's required to infer the shape of
  //  the array they want back
  return [
    {
      role: "system",
      content: `The user is sending a request to ${
        orgInfo ? `${orgInfo.name}'s` : "an"
      } API. ${
        orgInfo ? orgInfo.description : ""
      } However, they do not have access to the real API.

Your task is to generate a mock API response to the user's request.`,
    },
    {
      role: "user",
      content: `
I am sending a ${requestMethod} request to the ${path} endpoint${
        requestParameters
          ? ` with parameters:
${requestParameters.map((param) => chunkToString(param)).join("\n")}`
          : " with no parameters."
      }

${
  responseType
    ? `There are specific fields that I want to be returned in the response.

Below is an example of how to generate your response from these fields.

-- EXAMPLE 1 --

Fields
---

Name (type: string, description: The user's name)
Age (type: integer, description: The user's age)
City (type: string, description: The user's city)

Response
---

Name: John
Age: 25
City: New York

-- EXAMPLE 2 --

Fields
---

Company name (type= number, description = The name of the company)
Annual earnings (type= integer, description = The earnings of the company)
CEO name (type= string, description = the name of the ceo)

Response
---

Company name: Apply
Annual earnings: 1000000
CEO name: Tim Cook

-- END OF EXAMPLES --

Provide a response for the type given below. Include only the fields below. Follow the format from the examples above. 

Fields
---

${Object.entries(responseType)
  .map(([k, v]) => `${k} (type = ${v.type}, description = ${v.description})`)
  .join("\n")}

Response
---
`
    : ""
}
`,
    },
  ];
}
