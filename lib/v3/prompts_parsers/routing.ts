import { ChatGPTMessage } from "../../models";

export const routingLLMParams = {
  temperature: 0,
  max_tokens: 600,
  stop: ["</choice"],
};

export function routingPromptv3(args: {
  userRequest: string;
  org: { name: string; description: string };
  actions: { name: string; filtering_description: string }[];
}): ChatGPTMessage[] {
  return [
    {
      role: "system",
      content: `You are ${
        args.org.name
      } AI. Your task is to select the most relevant AI subsystem to use (from DOCS and CODE) to answer a user request. Assume that the user's request is possible.
${args.org.description ? "\n" + args.org.description + "\n" : ""}
<functions>
${args.actions
  .map((a, idx) => `${idx + 1}. ${a.name}: ${a.filtering_description}`)
  .join("\n")}
</functions>

<criteria>
CODE
Writes code to call ${args.org.name}'s API by calling <functions></functions>
Use when:
- calling <functions></functions> to achieve tasks in ${args.org.name}
- performing calculations, aggregating & slicing data and plotting outputs returned from <functions></functions> (examples: "Plot the top 5 products by profitability in the past 6 months" or "Which warehouse has the highest total value of stock?")
- performing edits/adds (example: "Make all the summer products inactive" when there's a update_product function)

DOCS
Searches ${args.org.name}'s documentation
Use when:
- asked how-to questions
- asked questions about how the system works
- asked what terminology related to ${args.org.name} means
</criteria>

<rules>
1. Follow the <criteria></criteria> to select from CODE or DOCS as your <choice></choice>
2. Follow the <format></format>
</rules>

<format>
<thinking>
1. Think step-by-step how to answer the user's request
2. consider if the user's request requires documentation - use DOCS if so
</thinking>
<choice>DOCS|DIRECT</choice>
</format>`,
    },
    { role: "user", content: args.userRequest },
    { role: "assistant", content: "<thinking>\n1." },
  ];
}

export function parseRoutingOutputv3(
  output: string,
): { thoughts: string; choice: "DOCS" | "CODE" } | null {
  const thoughtsMatch = output.match(/<thinking>([\s\S]*)<\/thinking>/);
  const thoughts = thoughtsMatch ? thoughtsMatch[1].trim() : "";
  const choiceMatch = output.match(/<choice>(.*)<\/choice>/);
  if (!choiceMatch) {
    return null;
  }
  return {
    thoughts: thoughts,
    choice: choiceMatch[1] as "DOCS" | "CODE",
  };
}
