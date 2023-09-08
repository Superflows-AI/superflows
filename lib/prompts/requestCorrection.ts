import { ChatGPTMessage } from "../models";
import { Action } from "../types";
import { getActionDescriptions } from "./chatBot";

export default function requestCorrectionPrompt(
  missingParam: string,
  action: Action
): ChatGPTMessage[] | null {
  const paramDetails = extractParamDetails(
    getActionDescriptions([action]),
    missingParam
  );

  if (!paramDetails) {
    console.warn(
      `Could not find missing parameter "${missingParam}" in action "${action.name}.

It should have no choice associated with it so should be being filled in automatically."`
    );
    return null;
  }

  return [
    {
      role: "user",
      content: `Your previous response was incorrect. For function "${action.name}" your response was missing the required parameter "${missingParam}".

Using the information above, output a value for the missing parameter. If you are unsure of what to output, output "ask user" for more information.

As above the parameter will be formatted as: "{{NAME}} ({{DATATYPE}}: [{{POSSIBLE_VALUES}}]): {{DESCRIPTION}}

Below are two examples of how to generate your response for the parameter.

-- EXAMPLE 1 --

Parameter
---

userId (string): The user's ID

Response
---

abc123

-- EXAMPLE 2 --

Parameter
---

userName (string): The user's name

Response
---

ask user

-- END OF EXAMPLES --

Provide a response for the parameter below. Follow the format exactly from the examples above. Output only the response or "ask user". Do not output the parameter name or description.


Parameter
---

${paramDetails}

Response
---

`,
    },
  ];
}

export function extractParamDetails(
  query: string,
  paramName: string
): string | null {
  // Matches the parameter name, type within parentheses, and an optional description after the colon.
  const regex = new RegExp(
    `- ${paramName} \\(([^)]+)\\)(: ([A-Za-z0-9 .,]+))?`,
    "gm"
  );
  let match = regex.exec(query);
  const param = match ? `${match[0]}` : null;
  // Don't need the leading dash
  return param ? param.replace(/^(-)+/, "").trim() : null;
}
