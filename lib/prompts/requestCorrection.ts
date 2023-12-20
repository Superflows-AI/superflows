import { ChatGPTMessage } from "../models";
import { Action } from "../types";
import { getActionDescriptions, getIntroText } from "./chatBot";

export function requestCorrectionSystemPrompt(
  orgInfo: {
    name: string;
    description: string;
  },
  userDescription: string | undefined,
): ChatGPTMessage {
  return {
    role: "system",
    content: `${getIntroText(orgInfo)} Your purpose is to assist users ${
      orgInfo.name ? `in ${orgInfo.name} ` : ""
    }via function calls
${
  userDescription
    ? `\nThe following is a description of the user: ${userDescription}\n`
    : ""
}
The main chatbot AI has made a mistake in a function call. Your role is to output a value for the missing parameter to correct this mistake

If you are unsure of what to output, output "ask user". Avoid asking the user unless you absolutely have to

Output only the response or "ask user"

Today's date is ${new Date().toISOString().split("T")[0]}`,
  };
}

export default function requestCorrectionPrompt(
  missingParam: string,
  action: Action,
): ChatGPTMessage | null {
  const paramDetails = extractRequiredParamDetails(
    getActionDescriptions([action]),
    missingParam,
  );
  console.log(
    `Extracted missing param called "${missingParam}":\n${paramDetails}`,
  );

  if (!paramDetails) {
    console.warn(
      `Could not find missing parameter "${missingParam}" in action "${action.name}"

It should have no choice associated with it so should be being filled in automatically."`,
    );
    return null;
  }

  return {
    role: "function",
    name: action.name,
    content: `Error: Invalid function call. Function "${action.name}" is missing required parameter "${missingParam}"

Parameter definition:
${paramDetails}`,
  };
}

export function extractRequiredParamDetails(
  query: string,
  paramName: string,
): string | null {
  // Matches the parameter name, type within parentheses, and an optional description after the colon.
  const regex = new RegExp(
    `- ${paramName} \\(([^)]+)\\)(: .*?)? REQUIRED(.*?\n-)?`,
    "gs",
  );
  let match = regex.exec(query);
  if (!match) return null;
  if (match[0].endsWith("-")) {
    return match[0].slice(0, -1).trim();
  }
  return match[0].trim();
}
