import { ChatGPTMessage } from "../../models";

export const routingLLMParams = {
  temperature: 0,
  max_tokens: 400,
  stop: ['"""', "```"],
};

export function routingPrompt(args: {
  userRequest: string;
  org: { name: string; description: string; chat_to_docs_enabled: boolean };
  actions: { name: string; filtering_description: string }[];
  userDescription?: string;
  isAnthropic?: boolean; // Support non-Anthropic for fallbacks (future feature not yet built)
}): ChatGPTMessage[] {
  const out: ChatGPTMessage[] = [
    {
      role: "system",
      content: `You are ${
        args.org.name
      } AI. Your task is to select the most relevant AI subsystem to use (from DIRECT${
        args.org.chat_to_docs_enabled ? ", DOCS" : ""
      } and CODE)  to answer a user request. Assume that the user's request is possible.
${args.org.description ? "\n" + args.org.description + "\n" : ""}${
        args.userDescription
          ? "\nUser description: " + args.userDescription + "\n"
          : ""
      }
FUNCTIONS:
\`\`\`
${args.actions
  .map((a, idx) => `${idx + 1}. ${a.name}: ${a.filtering_description}`)
  .join("\n")}
\`\`\`

CRITERIA
"""
CODE
Writes code to call ${args.org.name}'s API by calling FUNCTIONS
It CAN'T search by name - in this case, use DIRECT instead
Use when:
- performing calculations, aggregating & slicing data and plotting outputs returned from FUNCTIONS (examples: "Plot the top 5 products by profitability in the past 6 months" or "Which warehouse has the highest total value of stock?")
- performing batch edits/adds (example: "Make all the summer products inactive" when there's a update_product function)

DIRECT
Calls FUNCTIONS 1-by-1. Can run CODE as a subroutine, but it is slower
Use when:
- searching by name (example: "How much is the Alpine Redwoods property worth?")
- retrieving or editing <5 datapoints (example: "Update XYZ product's price to $20")
- retrieving already aggregated data from FUNCTIONS (example: "What's the total value of stock in the warehouse?")
${
  args.org.chat_to_docs_enabled
    ? `
DOCS
Searches ${args.org.name}'s documentation
Use when:
- asked how-to questions
- asked questions about how the system works
- asked what terminology means
`
    : ""
}"""

RULES:
1. Select from CODE${
        args.org.chat_to_docs_enabled ? ", DOCS" : ""
      } or DIRECT following the CRITERIA and output after "Choice:"
2. Follow the format below - include Thoughts (as a numbered list) and Choice:
"""
Thoughts:
1. Think step-by-step how to answer the user's request
2. ${
        args.org.chat_to_docs_enabled
          ? "consider if the user's request the documentation - use DOCS if so"
          : "break down the user's request into steps"
      }
3. specifically name EVERY SINGLE function and variable you will use
4. consider if the user's request requires searching by name - use DIRECT if so
5. compare the user's request with CRITERIA
6. state your choice

Choice: ${args.org.chat_to_docs_enabled ? "DOCS/" : ""}DIRECT/CODE
"""`,
    },
  ];
  if (args.isAnthropic) {
    out.push({ role: "user", content: args.userRequest });
    out.push({ role: "assistant", content: "Thoughts:\n1. " });
  } else {
    out[0].content += `\n\nUser's request: ${args.userRequest}`;
  }
  return out;
}

export function parseRoutingOutput(
  output: string,
  streaming: boolean,
): { thoughts: string; choice: string } | null {
  if (streaming) {
    if (!output.match(/^Choice: .*\s/m)) {
      return null;
    }
    return {
      thoughts: output.split("Thoughts:")[1].split("Choice:")[0].trim(),
      choice: output.match(/^Choice: (.*)\s/m)![1],
    };
  }
  if (!output.match(/^Choice: .*/m)) {
    return null;
  }
  return {
    thoughts: output.split("Thoughts:")[1].split("Choice:")[0].trim(),
    choice: output.match(/^Choice: (\w*)\b/m)![1],
  };
}
