import { ChatGPTMessage } from "../../models";

export const filteringLLMParams = {
  temperature: 0,
  max_tokens: 800,
  stop: ["</selected"],
};

export function actionFilteringPrompt(args: {
  userRequest: string;
  actionDescriptions: string[];
  orgName: string;
}): ChatGPTMessage[] {
  return [
    {
      role: "system",
      content: `You are ${
        args.orgName || "a"
      } chatbot AI. Your task is to select functions from <functions></functions> that can be used to answer a user's request. A developer will use these to write code to answer the user's request

<functions>
${args.actionDescriptions.map((a, idx) => `${idx + 1}. ${a}`).join("\n")}
</functions>

<rules>
1. Select the functions needed to fulfill the user's request by writing them as a list under 'Selected functions'. Leave it empty if none are relevant or the user's request isn't possible. If the user's request is unclear, also leave it empty.
2. NEVER write code or pseudocode
3. The developer using these functions can perform any standard operations (aggregate, slice, sum) on what the functions return
4. Respond following <format></format>
</rules>

<format>
<thinking>
1. Think step-by-step how to use the functions to answer the user's request
2. consider what the most helpful possible answer would include
3. break down the user's request into steps in extreme detail
4. specifically name EVERY SINGLE function and variable you will use
5. specify where you'll get every variable from - you may need to call another function first
</thinking>
<selected_functions>
selected_function_1
selected_function_2
...
</selected_functions>
</format>`,
    },
    {
      role: "user",
      content: args.userRequest,
    },
    {
      role: "assistant",
      content: "<thinking>\n1.",
    },
  ];
}

export interface ActionFilteringOutput {
  thoughts: string;
  selectedFunctions: string[];
}
export function parseFilteringOutputv3(
  output: string,
  possibleOutputs: string[],
): ActionFilteringOutput {
  // Split out into thoughts and selected functions
  if (!output.includes("<selected_functions>")) {
    return { thoughts: "", selectedFunctions: [] };
  }
  const thoughtsMatch = output.match(/<thinking>([\s\S]*)<\/thinking>/);
  const thoughts = thoughtsMatch ? thoughtsMatch[1] : "";
  const selectedFunctionsMatch = output.match(
    /<selected_functions>([\s\S]*)<\/selected_functions>/,
  );
  return {
    thoughts: thoughts.trim(),
    selectedFunctions: selectedFunctionsMatch
      ? selectedFunctionsMatch[1]
          .trim()
          .split("\n")
          .map((s) => {
            const match = s.match(/^(\d. |- )?([\w_]+).*\s?.*$/);
            if (!match) return "";
            return match[2];
          })
          .filter(Boolean)
          .filter((s) => possibleOutputs.includes(s))
      : [],
  };
}
