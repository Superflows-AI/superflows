import { ChatGPTMessage } from "../../models";
import { searchDocsActionName } from "../../builtinActions";
import { getActionFilteringDescriptions, getChatHistorySummary } from "./utils";
import { getIntroText } from "./chatBot";

export const clarificationLLMParams = {
  temperature: 0,
  max_tokens: 400,
  stop: ['"""', "```", "Clear: True", "Clear: true"],
};

export function clarificationPrompt(args: {
  userRequest: string;
  selectedActions: { name: string; filtering_description: string }[];
  orgInfo: { name: string; description: string };
  userDescription: string;
}): ChatGPTMessage[] {
  const out: ChatGPTMessage[] = [
    {
      role: "system",
      content: `${getIntroText(
        args.orgInfo,
      )}. Your task is to filter out unclear user requests. If unclear, you should ask clarifying questions to help the user get the answer they are looking for. If it is clear, the user's request is passed to a coder to write code that calls FUNCTIONS to answer the user. The coder can use multiple FUNCTIONS and can perform data analysis when necessary.

User description: ${args.userDescription}

FUNCTIONS:
\`\`\`
${getActionFilteringDescriptions(args.selectedActions)}
\`\`\`

Today's date is ${new Date().toISOString().split("T")[0]}

Examples (for different FUNCTIONS):
"""
User: What had the shortest delivery time last year?

Clear: False

Answer type of 'What' is unclear, could mean a product, warehouse or something else. Also, 'last year' could mean the last 12 months or previous calendar year.

---

User: What were the best selling products in the past 3 months?

Clear: False

User is looking for a list of products as an answer. 'best selling products' might mean most units sold or highest revenue.

---

User: Which page had the most unique visitors over the last 6 months?

Clear: True

Answer type of page is clear. A metric is defined 'unique visitors' and a date range is specified 'last 6 months'.

---
${
  args.selectedActions.find((a) => a.name === searchDocsActionName)
    ? `
User: How do I add a user?

Clear: True

This question requires searching the ${args.orgInfo.name} documentation since it's a how-to question.

---
`
    : ""
}
User: Which warehouse usually has the most items stored?

Clear: False

The answer type is clear 'warehouse'. However, 'usually' implies using a date range (example: past 6 months), but no range is given.

---

User: Which products should I order more of?

Clear: True

Answer type of products is clear. No date range given, but it's obvious from the question that it is about right now.
"""

RULES:
1. Decide whether the user's request is clear and output 'Clear: True | False'
2. DO NOT make any assumptions about the metrics or date ranges to use
3. DO NOT give the user a command, tell them to talk to a data analyst or call FUNCTIONS themselves
4. DO NOT mention FUNCTIONS or the coder to the user
5. Think about what the user knows when asking them questions. The user may not know IDs, but might know other details which you can search for 
6. Respond in the following format (Thoughts as a numbered list, 'Clear' and 'Tell user'):
"""
Thoughts:
1. Think step-by-step: break down the user's request in extreme detail. Be verbose
2. identify the type of answer the user wants (e.g. a person, product, or company)
3. consider if the type of answer is unclear, given FUNCTIONS (e.g. a person could be a customer or employee)
4. identify unclear phrases (e.g. 'last quarter', 'best')
5. identify if the request requires data analysis
6. identify clear metrics and dates when data analysis is required

Clear: False | True

Tell user: Ask clarifying questions here. Be friendly (example: start with "Sure!"). Be concise
"""`,
    },
    // args.chatHistory[args.chatHistory.length - 1],
    // ...args.chatHistory.slice(
    //   args.chatHistory.findIndex((m) => m.role === "user"),
    // ),
    { role: "user", content: args.userRequest },
    {
      role: "assistant",
      content: "Thoughts:\n1. ",
    },
  ];
  //   if (args.chatHistory.length > 1) {
  //     // If there are previous messages, add them as a chat history - reason for this is because otherwise
  //     // we'll have messages of different formats in the chat history, which the LLM will sometimes try to copy
  //     out[0].content += `
  //
  // CHAT HISTORY SUMMARY:
  // """
  // ${getChatHistorySummary(args.chatHistory, true)}
  // """`;
  //   }
  return out;
}

export interface ParsedClarificationOutput {
  thoughts: string;
  tellUser: string;
  clear: boolean;
}

export function parseClarificationOutput(
  output: string,
): ParsedClarificationOutput {
  let thoughts = output.match(/^Thoughts:\s+((\d\.?\s?.*\n?)+)/)?.[1] || "";
  thoughts = thoughts.trim();

  let tellUser = output.split("Tell user:")[1] || "";
  tellUser = tellUser.trim();

  const clear = !Boolean(
    output.match(/Clear: [Ff]alse/m) || output.match(/^Tell user:/m),
  );

  return { thoughts, tellUser, clear };
}
