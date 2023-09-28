import { ChatGPTMessage } from "../models";
import { Action } from "../types";
import { getActionDescriptions } from "./chatBot";

export function actionFilteringPrompt(
  actions: Action[],
  userQuery: string,
): ChatGPTMessage[] {
  const numberedActions = getActionDescriptions(actions, true);

  return [
    {
      role: "system",
      content: `You are an AI with the ability to call functions, you must determine the correct function based on the user's request. 
      
The functions you have access to are described below. 

The functions are formatted with {{NAME}}: {{DESCRIPTION}}. PARAMETERS: {{PARAMETERS}}. Each parameter is formatted like: "- {{NAME}} ({{DATATYPE}}: [{{POSSIBLE_VALUES}}]): {{DESCRIPTION}}. {{"REQUIRED" if parameter required}}"

FUNCTIONS START

${numberedActions}

FUNCTIONS END 

You have three options for each function: 

1. Relevant: Use this if you are certain that the user's request pertains to this function.
2. Not Sure: Use this if the user's request could possibly pertain to this function, but you aren't certain.
3. Irrelevant: Use this if you are certain that the user's request does not pertain to this function.

If the user's request is unclear, it's better to mark all functions as 'Not Sure' rather than risk making incorrect assumptions.

Every line of your response must be in the following format:

{function_name}: Relevant | Irrelevant | Not sure.

Your response must be exactly 13 lines, one line for each function.`,
    },
    { role: "user", content: userQuery },
  ];
}
