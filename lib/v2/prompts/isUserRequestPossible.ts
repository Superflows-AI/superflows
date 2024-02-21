import { snakeToCamel } from "../../utils";
import { ChatGPTMessage } from "../../models";

if (!process.env.IS_USER_REQUEST_POSSIBLE_MODEL) {
  throw new Error("IS_USER_REQUEST_POSSIBLE_MODEL env var is not defined");
}

export const isUserRequestPossibleLLMParams = {
  temperature: 0,
  max_tokens: 400,
  stop: ['"""', "```", "Possible: True", "Possible: true"],
  model: process.env.IS_USER_REQUEST_POSSIBLE_MODEL,
};

function isUserRequestPossiblePrompt(args: {
  question: string;
  selectedActions: { name: string; filtering_description: string }[];
  orgInfo: { name: string; description: string };
  userDescription: string;
}): ChatGPTMessage[] {
  const builtinActions = [
    {
      name: "plot_graph",
      filtering_description: "Plots a graph or table to be shown to the user",
    },
    {
      name: "search_docs",
      filtering_description: `Search ${args.orgInfo.name} documentation for questions on how to achieve tasks in the platform`,
    },
  ];
  const actionDescriptions = builtinActions
    .concat(args.selectedActions)
    .map(
      (a, idx) =>
        `${idx + 1}. ${snakeToCamel(a.name)}: ${a.filtering_description}`,
    )
    .join("\n");
  return [
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
3. Respond in the following format (Thoughts as a numbered list, 'Possible' and 'Tell user'):
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
    {
      role: "user",
      content: args.question,
    },
  ];
}

export function parseRequestPossibleOutput(output: string): {
  thoughts: string;
  tellUser: string;
  possible: boolean;
} {
  output = output.trim();
  // function parseOutput(output) {
  let thoughts = output.match(/^Thoughts:\s+((\d\. .+\n?)+)/)?.[1] || "";
  thoughts = thoughts.trim();

  const possible = !Boolean(
    output.match(/^Possible: [Ff]alse/m) ||
      (!thoughts && output) ||
      output.match(/^Tell user:/m),
  );

  let tellUser = "";
  if (output.includes("Tell user:")) {
    tellUser = output.split("Tell user:")[1];
  } else if (thoughts) {
    tellUser = output.replace(/Thoughts:/g, "").replace(thoughts, "");
  } else if (output.includes("Possible:")) {
    tellUser = output
      .replace(/Thoughts:/g, "")
      .replace(thoughts, "")
      .replace(/^Possible: ([Tt]rue|[Ff]alse)/m, "");
  } else {
    tellUser = output;
  }
  tellUser = tellUser.trim();

  return { thoughts, tellUser, possible };
}
