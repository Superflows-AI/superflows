import { capitaliseFirstLetter, snakeToCamel } from "../../utils";
import { ChatGPTMessage } from "../../models";
import { parseTellUser } from "./utils";
import { Organization } from "../../types";

export const isUserRequestPossibleLLMParams = {
  temperature: 0,
  max_tokens: 400,
  stop: ['"""', "```", "Possible: True", "Possible: true"],
};

export function isUserRequestPossiblePrompt(args: {
  chatHistory: ChatGPTMessage[];
  selectedActions: { name: string; filtering_description: string }[];
  orgInfo: Pick<Organization, "name" | "description">;
  userDescription: string;
}): ChatGPTMessage[] {
  const builtinActions = [
    {
      name: "plot_graph",
      filtering_description: "Plots a graph or table to be shown to the user",
    },
  ];
  const actionDescriptions = builtinActions
    .concat(args.selectedActions)
    .map(
      (a, idx) =>
        `${idx + 1}. ${snakeToCamel(a.name)}: ${a.filtering_description}`,
    )
    .join("\n");
  const out: ChatGPTMessage[] = [
    {
      role: "system",
      content: `You are ${args.orgInfo.name} AI. Your task is to decide if a user's request is possible to answer by writing code using FUNCTIONS. If the request is not possible, you must inform the user. Code can aggregate, filter, sort and transform data returned by FUNCTIONS.

User description: ${args.userDescription}

FUNCTIONS:
\`\`\`
${actionDescriptions}
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
${args.chatHistory
  .filter(
    (m, i) =>
      m.role === "user" ||
      (m.role === "assistant" &&
        args.chatHistory[i + 1].role === "user" &&
        parseTellUser(m.content)),
  )
  .map(
    (m) =>
      `${capitaliseFirstLetter(m.role)}: ${
        m.role === "user" ? m.content : parseTellUser(m.content)
      }`,
  )
  .join("\n\n")}
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
