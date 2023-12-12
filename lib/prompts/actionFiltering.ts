import { ChatGPTMessage } from "../models";
import { Action } from "../types";
import { getActionDescriptions } from "./chatBot";

export function actionFilteringPrompt(
  actions: Action[],
  userQuery: string,
): ChatGPTMessage[] {
  const numberedActions = getActionDescriptions(actions);

  return [
    {
      role: "system",
      content: `Below are ${actions.length} functions.

The functions are formatted with {{NAME}}: {{DESCRIPTION}}. PARAMETERS: {{PARAMETERS}}. Each parameter is formatted like: "- {{NAME}} ({{DATATYPE}}: [{{POSSIBLE_VALUES}}]): {{DESCRIPTION}}. {{"REQUIRED" if parameter required}}"

${numberedActions}

You have three options for each function:

1. Relevant: The function is relevant to the user's request
2. Not Sure: You are not 100% sure, or you do not know what the function does
3. Irrelevant: You are 100% certain the function has 0 relevance to the user's request

Mark functions as 'Not Sure' instead of Irrelevant if you are not 100% sure. This is very important do not forget this.

Every line of your response must be in the following format:
{function_name}: Relevant | Irrelevant | Not sure.

Your response must be exactly ${actions.length} lines, one line for each function.`,
    },
    { role: "user", content: userQuery },
  ];
}
