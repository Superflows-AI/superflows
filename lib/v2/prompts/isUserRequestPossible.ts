import { capitaliseFirstLetter } from "../../utils";
import { ChatGPTMessage } from "../../models";
import {
  getActionFilteringDescriptions,
  getChatHistorySummary,
  parseTellUser,
} from "./utils";
import { Action, Organization } from "../../types";
import { getIntroText } from "./chatBot";

export const isUserRequestPossibleLLMParams = {
  temperature: 0,
  max_tokens: 400,
  stop: ['"""', "```", "Possible: True", "Possible: true"],
};

export function isUserRequestPossiblePrompt(args: {
  chatHistory: ChatGPTMessage[];
  selectedActions: Pick<Action, "name" | "filtering_description">[];
  orgInfo: Pick<Organization, "name" | "description">;
  userDescription: string;
}): ChatGPTMessage[] {
  const out: ChatGPTMessage[] = [
    {
      role: "system",
      content: `${getIntroText(
        args.orgInfo,
      )}. Your task is to decide if a user's request is possible to answer by writing code using FUNCTIONS. If the request is not possible, you must inform the user. Code can aggregate, filter, sort and transform data returned by FUNCTIONS.

User description: ${args.userDescription}

FUNCTIONS:
\`\`\`
${getActionFilteringDescriptions(args.selectedActions)}
\`\`\`

RULES:
1. Decide whether the user's request is possible by writing code that calls FUNCTIONS and output 'Possible: True | False'
2. DO NOT tell the user about FUNCTIONS or that you are using them
3. DO NOT answer questions which are unrelated to ${args.orgInfo.name}
4. Respond in the following format (Thoughts as a numbered list, 'Possible' and 'Tell user'):
"""
Thoughts:
1. Think step-by-step how to use FUNCTIONS to answer the user's request
2. take a breath: be slow and deliberate
3. break down the user's request into steps in extreme detail
4. specifically name EVERY SINGLE function and variable the code will use
5. double-check these functions exist - mention their number from the list
6. specify where to get every variable from - the code may need to call other functions first

Possible: False | True

Tell user: Inform the user that their request is impossible. Mention the capabilities. Be concise. DO NOT mention FUNCTIONS
"""`,
    },
  ];
  if (args.chatHistory.length === 1) {
    // If this is the first message, add it as a normal user message
    out.push(args.chatHistory[args.chatHistory.length - 1]);
  } else {
    // If there are previous messages, add them as a chat history - reason for this is because otherwise
    // we'll have messages of different formats in the chat history, which the LLM will sometimes try to copy
    out[0].content += `

CHAT HISTORY SUMMARY:
"""
${getChatHistorySummary(args.chatHistory)}
"""`;
  }
  return out;
}

export interface ParsedRequestPossibleOutput {
  thoughts: string;
  tellUser: string;
  possible: boolean;
}

export function parseRequestPossibleOutput(
  output: string,
): ParsedRequestPossibleOutput {
  // function parseOutput(output) {
  if (!output.trim()) {
    return { thoughts: "", possible: true, tellUser: "" };
  }
  if ("Thoughts:\n1. ".includes(output)) {
    return { thoughts: "", possible: false, tellUser: "" };
  }
  output = output.trim();
  let thoughts = output.match(/^Thoughts:\s+((\d\.? ?.*\n?)+)/)?.[1] || "";
  thoughts = thoughts.trim();

  const possible = !Boolean(
    output.match(/^Possible: [Ff]alse/m) ||
      (!thoughts && output) ||
      output.match(/^Tell user:/m),
  );

  let tellUser = "";
  if (output.includes("Tell user:")) {
    tellUser = output.split("Tell user:")[1];
  } else if (thoughts || output.match(/^Possible:?/m)) {
    tellUser = output
      .replace(/Thoughts:/g, "")
      .replace(thoughts, "")
      .replace(/^Possible:?\s?([Tt]rue|[Ff]alse)?$/m, "")
      .replace(/^Tell( user)?/m, "");
  } else {
    tellUser = output;
  }
  tellUser = tellUser.trim();

  return { thoughts, tellUser, possible };
}

export function impossibleExplanation(args: {
  thoughts: string;
  selectedActions: Pick<Action, "name" | "filtering_description">[];
  chatHistory: ChatGPTMessage[];
  orgInfo: { name: string; description: string };
  userDescription: string;
}): ChatGPTMessage[] {
  return [
    {
      role: "system",
      content: `${getIntroText(
        args.orgInfo,
      )}. Your task is to explain to the user why their request is not possible. You have already thought about the user's request and why it is not possible, you must now tell them.
${args.userDescription ? `\nUser description: ${args.userDescription}\n` : ""}
Your capabilities are listed as functions below:
\`\`\`
${getActionFilteringDescriptions(args.selectedActions)}
\`\`\`

SUMMARY:
"""
${getChatHistorySummary(args.chatHistory)}

Assistant thoughts:
${args.thoughts}
"""

RULES:
1. DO NOT tell the user their request is possible
2. DO NOT mention the functions listed above by name`,
    },
  ];
}
