import { ChatGPTMessage } from "../../models";
import { getActionFilteringDescriptions, languageLine } from "./utils";
import { Action } from "../../types";
import { getIntroText } from "./chatBot";

export function explainNotPossiblePrompt(args: {
  thoughts: string;
  userRequest: string;
  actions: Pick<Action, "name" | "filtering_description">[];
  org: { name: string; description: string };
  userDescription: string;
  language: string | null;
}): ChatGPTMessage[] {
  return [
    {
      role: "system",
      content: `${getIntroText(
        args.org,
      )}. Your task is to explain to the user why their request is not possible. You have already thought about the user's request and why it is not possible, you must now tell them.
${args.userDescription ? `\nUser description: ${args.userDescription}\n` : ""}
Your capabilities are listed as functions below:
\`\`\`
${getActionFilteringDescriptions(args.actions)}
\`\`\`

User request: ${args.userRequest}

Assistant thoughts:
${args.thoughts}

RULES:
1. DO NOT tell the user their request is possible
2. DO NOT mention the functions listed above by name
3. ${languageLine(args.language)}`,
    },
  ];
}
