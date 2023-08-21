import { ChatGPTMessage, Chunk, Properties, RequestMethod } from "../models";
import { chunkToString } from "../utils";
import { PRESETS } from "../consts";

export default function apiMockPrompt(
  path: string,
  requestMethod: RequestMethod,
  requestParameters: Chunk[] | null,
  responseType: Properties | null,
  orgInfo?: {
    name: string;
    description: string;
  },
  isArray: boolean = false
): ChatGPTMessage[] {
  // TODO: Maybe add Examples to prompt type as e.g for retrieve_event_counts_for_a_team it's required to infer the shape of
  //  the array they want back
  // TODO: randomly select the length of the array rather than hardcoding 3
  return [
    {
      role: "system",
      content: `The user is sending a request to ${
        orgInfo && !PRESETS.map((p) => p.name).includes(orgInfo.name)
          ? `${orgInfo.name}'s`
          : "an"
      } API. ${
        orgInfo &&
        !PRESETS.map((p) => p.description).includes(orgInfo.description)
          ? orgInfo.description
          : ""
      } However, they do not have access to the real API.

Your task is to generate a mock API response to the user's request.

Today's date is ${new Date().toISOString().split("T")[0]}.`,
    },
    {
      role: "user",
      content: `I am sending a ${requestMethod} request to the ${path} endpoint${
        requestParameters
          ? ` with parameters:
${requestParameters.map((param) => chunkToString(param)).join("\n")}`
          : " with no parameters."
      }

${
  responseType
    ? `There are specific fields that I want to be returned in the response.
${
  isArray
    ? "These fields form an array. I want the array to be of length 3."
    : ""
} 
Below are two examples of how to generate your response from these fields.

-- EXAMPLE 1 --

Fields
---

Name (string): The user's name
Age (integer): The user's age
City (string): where the user lives

Response
---

${
  isArray
    ? `
Name: [John, Jane, Jack]
Age: [25, 30, 35]
City: [New York, London, Paris]
  `
    : `
Name: John
Age: 25
City: New York
`
}

-- EXAMPLE 2 --

Fields
---

Company_name (string): The name of the company
Annual_earnings (integer): The company's annual earnings (USD)
CEO_name (string): The name of the CEO

Response
---

${
  isArray
    ? `
Company_name: [Apple, Google, Facebook]
Annual_earnings: [1000000, 2000000, 3000000]
CEO_name: [Tim Cook, Sundar Pichai, Mark Zuckerberg]
`
    : `
Company_name: Apple
Annual_earnings: 1000000
CEO_name: Tim Cook
`
}

-- END OF EXAMPLES --

Provide a response for the type given below. Include only the fields below. Follow the format exactly from the examples above. Do not output json.

Fields
---

${Object.entries(responseType)
  .map(([k, v]) => `${k} (${v.type}): ${v.description ?? "no description"}`)
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
